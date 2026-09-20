/**
 * Ejecuta Lighthouse (móvil + escritorio) contra rutas del frontend Vite y
 * guarda los informes en tests/lighthouse-reports.
 *
 * La métrica debe replicar PRODUCCIÓN, no el dev-server:
 *   1) `pnpm --filter frontend build` y se sirve `frontend/dist` con un server
 *      propio que comprime con gzip como nginx y cae a index.html (SPA).
 *   2) El API está STUBEADO: las páginas autenticadas no dependen del backend.
 *      El stub responde `/api/auth/me`, `/api/ovas`, `/api/ovas/papelera/count`
 *      y `POST /api/auth/login`; el resto del API devuelve 404. La "sesión" se
 *      activa con la cookie de stub `genova_lh_auth=1`, que el runner envía solo
 *      en las rutas autenticadas vía `--extra-headers` (igual que el proxy+
 *      cookies de la versión Angular): `/login` se audita como invitado y
 *      `/dashboard` con sesión.
 *
 * Requisitos: Chrome/Chromium local. En WSL, si chrome-launcher no lo
 * encuentra, apunta CHROME_PATH al binario (el de Playwright sirve, véase
 * fallbackChromePath()).
 *
 * Uso: node tests/run-lighthouse.mjs [/ruta1 /ruta2 …] [--no-build]
 *   - Por defecto audita /login y /dashboard, cada una en móvil y escritorio.
 *   - --no-build reutiliza frontend/dist sin recompilar.
 * Salida: <ruta>-<dispositivo>.report.html/json + summary.json/md en
 * tests/lighthouse-reports y la tabla de métricas por consola.
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, writeFile, readFile, stat, rm, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'frontend', 'dist')
const lhDir = path.join(root, 'tests', 'lighthouse-reports')

// Puerto propio: NO reutiliza el :4200 del dev server/e2e (colisionaría y se
// auditaría el bundle de desarrollo, no el de producción).
const PORT = Number(process.env.GENOVA_LH_PORT || 4201)
const HOST = `http://localhost:${PORT}`
const STUB_COOKIE = 'genova_lh_auth=1'
const DEFAULT_ROUTES = ['/login', '/dashboard']
const DEVICES = [
  { name: 'mobile', preset: [] },
  { name: 'desktop', preset: ['--preset=desktop'] },
]

function parseArgs(argv) {
  const noBuild = argv.includes('--no-build')
  const routes = argv.filter((a) => !a.startsWith('--')).map((r) => (r.startsWith('/') ? r : `/${r}`))
  return { routes: routes.length > 0 ? routes : DEFAULT_ROUTES, noBuild }
}

/** "mis-ovas" → id de archivo seguro; "/" → "home". */
function routeId(route) {
  const clean = route.replace(/^\/+/, '').replace(/[^a-zA-Z0-9-]+/g, '-')
  return clean === '' ? 'home' : clean
}

function buildProd() {
  console.log('Compilando frontend (pnpm --filter frontend build) …')
  const r = spawnSync('pnpm --filter frontend build', { cwd: root, stdio: 'inherit', shell: true })
  if (r.status !== 0) throw new Error('build del frontend falló')
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])

// Datos de ejemplo deterministas: el dashboard muestra tarjetas, actividad
// reciente y panel admin; estados "listo" evitan el sondeo de jobs.
const STUB_USER = {
  id: 'stub-user-1',
  role: 'administrador',
  email: 'admin@genova.ai',
  full_name: 'Admin GenOVA',
  permissions: [],
}
const STUB_OVAS = ['Fotosíntesis interactiva', 'Sistema solar 5E'].map((title, i) => ({
  id: `ova-stub-${i + 1}`,
  title,
  description: 'OVA de ejemplo generado para la auditoría de Lighthouse.',
  status: 'listo',
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-10T10:00:00Z',
  owner: { full_name: 'Admin GenOVA' },
}))

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(buf.length),
    'cache-control': 'no-store',
  })
  res.end(buf)
}

function stubApi(req, res, pathname) {
  const authed = (req.headers.cookie || '').includes(STUB_COOKIE)
  if (pathname === '/api/auth/me') {
    return authed ? sendJson(res, 200, STUB_USER) : sendJson(res, 401, { detail: 'No autenticado (stub)' })
  }
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    return sendJson(res, 200, { message: 'Sesión iniciada (stub)' })
  }
  if (pathname === '/api/ovas' || pathname === '/api/ovas/papelera') {
    if (!authed) return sendJson(res, 401, { detail: 'No autenticado (stub)' })
    return sendJson(res, 200, { ovas: STUB_OVAS, total_items: STUB_OVAS.length, total_pages: 1 })
  }
  if (pathname === '/api/ovas/papelera/count') {
    if (!authed) return sendJson(res, 401, { detail: 'No autenticado (stub)' })
    return sendJson(res, 200, { count: 0 })
  }
  return sendJson(res, 404, { detail: `stub: endpoint no simulado (${pathname})` })
}

/** Server estático que replica nginx prod: gzip + cache largo en /assets + SPA + stub del API. */
function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x')
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
        return stubApi(req, res, url.pathname)
      }
      let fp = path.join(distDir, decodeURIComponent(url.pathname))
      // Sin stat previo (evita TOCTOU js/file-system-race): se intenta leer y se
      // reacciona al error — EISDIR → index.html del directorio, resto → SPA.
      let buf
      try {
        buf = await readFile(fp)
      } catch (err) {
        fp = err?.code === 'EISDIR' ? path.join(fp, 'index.html') : path.join(distDir, 'index.html')
        buf = await readFile(fp)
      }
      const ext = path.extname(fp)
      const headers = { 'content-type': MIME[ext] || 'application/octet-stream' }
      // Como nginx prod: assets con hash → caché inmutable; el resto, revalidar.
      headers['cache-control'] = url.pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
      if ((req.headers['accept-encoding'] || '').includes('gzip') && COMPRESSIBLE.has(ext)) {
        headers['content-encoding'] = 'gzip'
        res.writeHead(200, headers)
        res.end(gzipSync(buf))
      } else {
        res.writeHead(200, headers)
        res.end(buf)
      }
    } catch {
      try {
        res.writeHead(404)
        res.end('not found')
      } catch {
        /* socket ya cerrado */
      }
    }
  })
  return new Promise((resolve, reject) => {
    server.on('error', (e) => {
      const msg =
        e?.code === 'EADDRINUSE'
          ? `El puerto ${PORT} está ocupado. Libre con GENOVA_LH_PORT=<puerto>.`
          : e?.message
      reject(new Error(msg))
    })
    server.listen(PORT, () => resolve(server))
  })
}

/**
 * chrome-launcher solo mira instalaciones de Chrome: si no hay, se recurre a
 * Edge/Chrome en sus rutas estándar (Windows/macOS) o al chromium de la suite
 * e2e de Playwright en WSL/Linux.
 */
async function fallbackChromePath() {
  if (process.env.CHROME_PATH) return
  const candidates = []
  if (process.platform === 'win32') {
    for (const base of ['C:\\Program Files', 'C:\\Program Files (x86)']) {
      candidates.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'))
      candidates.push(path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
    }
    candidates.push(path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'))
  } else if (process.platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    candidates.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge')
  } else {
    const cache = path.join(homedir(), '.cache', 'ms-playwright')
    try {
      const dirs = (await readdir(cache)).filter((d) => d.startsWith('chromium-')).sort().reverse()
      for (const d of dirs) {
        for (const sub of await readdir(path.join(cache, d))) {
          candidates.push(path.join(cache, d, sub, 'chrome'))
        }
      }
    } catch {
      /* sin cache de playwright; chrome-launcher dará su propio error si no hay Chrome */
    }
  }
  for (const bin of candidates) {
    if (bin && existsSync(bin)) {
      process.env.CHROME_PATH = bin
      return
    }
  }
}

// Async (spawn, NO spawnSync): el server estático corre en ESTE mismo proceso;
// spawnSync bloquearía el event loop y el server no respondería a Lighthouse.
async function runLh(url, base, extraFlags = []) {
  const args = [
    'lighthouse',
    url,
    '--quiet',
    '--chrome-flags=--headless --no-sandbox',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=html',
    '--output=json',
    `--output-path=${base}`,
    ...extraFlags,
  ]
  console.log('Lighthouse', path.basename(base), '→', url)
  // Borrar el reporte previo para que el chequeo de "existe" tras un exit≠0 no
  // dé un falso positivo con un JSON viejo.
  await rm(`${base}.report.json`, { force: true })
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, { cwd: root, shell: true, stdio: 'inherit' })
    proc.on('error', reject)
    proc.on('exit', (code) => {
      // chrome-launcher a veces sale con EPERM al borrar su temp dir en Windows
      // DESPUÉS de escribir el reporte. Si el JSON existe, la auditoría fue OK.
      if (code === 0) return resolve()
      stat(`${base}.report.json`)
        .then(() => {
          console.warn(`  (exit ${code} ignorado: reporte de ${path.basename(base)} sí se generó)`)
          resolve()
        })
        .catch(() => reject(new Error(`Lighthouse failed for ${path.basename(base)}: ${code}`)))
    })
  })
}

function fmtMs(v) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`
}

/** Métricas del JSON de Lighthouse: score de rendimiento + FCP/LCP/TBT/CLS. */
function extractMetrics(json) {
  const a = json.audits || {}
  return {
    performance: Math.round((json.categories?.performance?.score || 0) * 100),
    accessibility: Math.round((json.categories?.accessibility?.score || 0) * 100),
    bestPractices: Math.round((json.categories?.['best-practices']?.score || 0) * 100),
    seo: Math.round((json.categories?.seo?.score || 0) * 100),
    fcpMs: a['first-contentful-paint']?.numericValue ?? 0,
    lcpMs: a['largest-contentful-paint']?.numericValue ?? 0,
    tbtMs: a['total-blocking-time']?.numericValue ?? 0,
    cls: a['cumulative-layout-shift']?.numericValue ?? 0,
  }
}

function buildSummaryTable(rows) {
  const head =
    '| Ruta | Dispositivo | Rendimiento | FCP | LCP | TBT | CLS |\n|---|---|---|---|---|---|---|'
  const body = rows
    .map(
      (r) =>
        `| ${r.route} | ${r.device} | ${r.performance} | ${fmtMs(r.fcpMs)} | ${fmtMs(r.lcpMs)} | ${fmtMs(r.tbtMs)} | ${r.cls.toFixed(3)} |`,
    )
    .join('\n')
  return `${head}\n${body}\n`
}

async function main() {
  const { routes, noBuild } = parseArgs(process.argv.slice(2))
  await mkdir(lhDir, { recursive: true })

  if (noBuild) {
    if (!existsSync(path.join(distDir, 'index.html'))) {
      throw new Error('--no-build pero no existe frontend/dist/index.html; ejecuta el build antes')
    }
  } else {
    buildProd()
  }

  await fallbackChromePath()
  if (process.env.CHROME_PATH) console.log(`CHROME_PATH = ${process.env.CHROME_PATH}`)

  // Cookie de sesión de stub, solo para las rutas autenticadas.
  const hdrFile = path.join(lhDir, 'extra-headers.json')
  await writeFile(hdrFile, JSON.stringify({ Cookie: STUB_COOKIE }), 'utf8')

  const server = await startStaticServer()
  console.log(`Server estático (gzip + SPA + stub del API) en ${HOST}`)

  try {
    const rows = []
    for (const route of routes) {
      const id = routeId(route)
      const url = `${HOST}${route}`
      const authed = !['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/explore'].some(
        (p) => route === p || route.startsWith(`${p}/`),
      )
      for (const device of DEVICES) {
        const base = path.join(lhDir, `${id}-${device.name}`)
        const extra = [...device.preset, ...(authed ? [`--extra-headers=${hdrFile}`] : [])]
        await runLh(url, base, extra)
        const json = JSON.parse(await readFile(`${base}.report.json`, 'utf8'))
        const metrics = extractMetrics(json)
        rows.push({ route, device: device.name, url, ...metrics })
      }
    }

    const table = buildSummaryTable(rows)
    await writeFile(path.join(lhDir, 'summary.json'), JSON.stringify(rows, null, 2), 'utf8')
    await writeFile(path.join(lhDir, 'summary.md'), table, 'utf8')
    console.log('\n' + table)
    console.log(`\nInformes en ${lhDir} (summary.json / summary.md)`)
  } finally {
    server.close()
  }
}

// Red de seguridad: un error tardío en un socket abortado (gzip/SPA durante
// una recarga de Lighthouse) no debe tumbar el server a mitad de auditoría.
process.on('uncaughtException', (e) => console.warn('uncaughtException (ignorado):', e.message))

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
