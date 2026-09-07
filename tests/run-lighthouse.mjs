/**
 * Ejecuta Lighthouse contra TODO el frontend y guarda HTML/JSON + PNG de scores.
 *
 * IMPORTANTE — la métrica debe replicar PRODUCCIÓN, no el dev-server:
 *   - `ng serve` de desarrollo sirve un bundle SIN minificar (~8.5 MB) → score ~35.
 *   - `ng serve --configuration production` minifica pero NO comprime (gzip) →
 *     Lighthouse mide ~450 KB de JS en vez de ~148 KB → LCP/score inflados a la baja.
 *   Prod real (nginx `gzip on`, Vercel brotli) sirve estático COMPRIMIDO. Por eso
 *   este script hace `ng build` y sirve el dist con un server propio que:
 *     1) comprime con gzip como nginx,
 *     2) hace proxy de /api y /auth al backend (127.0.0.1:8000) para que el login
 *        y las páginas autenticadas funcionen,
 *     3) cae a index.html para el routing SPA.
 *   Con esto login/register/etc. puntúan ~90+ (representativo del deploy real).
 *
 * Requisitos: backend corriendo en :8000 (uvicorn) para las rutas autenticadas.
 * Uso: node tests/run-lighthouse.mjs
 */
import { chromium } from '@playwright/test'
import { createServer, request as httpRequest } from 'node:http'
import { mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendDir = path.join(root, 'frontend')
const distDir = path.join(frontendDir, 'dist/frontend-ng/browser')
const outDir = path.join(root, 'docs/assets/usabilidad')
const lhDir = path.join(root, 'tests/lighthouse-reports')

const PORT = 4200
const HOST = `http://localhost:${PORT}`
const BACKEND = process.env.GENOVA_TEST_BACKEND || 'http://127.0.0.1:8000'

// Cobertura de TODO el frontend: cada página renderizable con URL propia (una
// corrida Lighthouse por URL = scores independientes por página). Se ingresa como
// admin para auditar también rutas autenticadas y de administración.
//
// Las rutas con :id (engage/:id, workspace/:id) se añaden dinámicamente en main()
// tras el login (workspace necesita el id de una OVA real del admin).
//
// Excluidas a propósito: rutas que son solo redirect (crear-ova→crear,
// modelos/fallback→models, admin/users→/admin, admin/platform→/models, legacy
// metodologia/*, etc.) — auditarlas mediría la página destino, no una nueva.
const pages = [
  // Públicas / auth
  { id: 'login', url: `${HOST}/login` },
  { id: 'register', url: `${HOST}/register` },
  { id: 'forgot-password', url: `${HOST}/forgot-password` },
  { id: 'reset-password', url: `${HOST}/reset-password` },
  { id: 'verify-email', url: `${HOST}/verify-email` },
  { id: 'explore', url: `${HOST}/explore` },
  { id: 'not-found', url: `${HOST}/ruta-inexistente-404` },
  // Autenticadas (requieren cookie de admin)
  { id: 'dashboard', url: `${HOST}/dashboard`, auth: true },
  { id: 'mis-ovas', url: `${HOST}/mis-ovas`, auth: true },
  { id: 'papelera', url: `${HOST}/papelera`, auth: true },
  { id: 'crear', url: `${HOST}/crear`, auth: true },
  { id: 'profile', url: `${HOST}/profile`, auth: true },
  { id: 'analytics', url: `${HOST}/analytics`, auth: true },
  { id: 'models', url: `${HOST}/models`, auth: true },
  // /admin es la página de usuarios (path ""); /admin/users es solo un redirect.
  { id: 'admin', url: `${HOST}/admin`, auth: true },
  { id: 'admin-roles', url: `${HOST}/admin/roles`, auth: true },
]

function buildProd() {
  console.log('Compilando build de producción (ng build) …')
  const r = spawnSync(process.execPath, [path.join(frontendDir, 'scripts/run-with-api-env.mjs'), 'build'], {
    cwd: frontendDir,
    stdio: 'inherit',
  })
  if (r.status !== 0) throw new Error('ng build falló')
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

/**
 * Reenvía /api y /auth al backend; reescribe cookies a localhost para que peguen.
 * Todo blindado: durante la auditoría Lighthouse recarga la página y aborta
 * requests en vuelo; un throw aquí (headers ya enviados, socket cerrado) mataría
 * el server y Lighthouse vería "Target closed". Nada debe tumbar el proceso.
 */
function proxyToBackend(req, res) {
  const target = new URL(BACKEND)
  const proxied = httpRequest(
    {
      hostname: target.hostname,
      port: target.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    },
    (pres) => {
      if (res.writableEnded || res.headersSent) {
        pres.resume()
        return
      }
      // Headers tal cual (no tocar transfer-encoding/content-length: romper el
      // framing hace que el browser nunca vea el fin de la respuesta → cuelga).
      const headers = { ...pres.headers }
      if (headers['set-cookie']) {
        headers['set-cookie'] = headers['set-cookie'].map((c) => c.replace(/;\s*Domain=[^;]+/i, ''))
      }
      try {
        res.writeHead(pres.statusCode ?? 502, headers)
        pres.pipe(res)
      } catch {
        pres.resume()
      }
    },
  )
  const fail = () => {
    try {
      if (!res.headersSent) res.writeHead(502)
      res.end('backend no disponible en ' + BACKEND)
    } catch {
      /* socket ya cerrado */
    }
  }
  proxied.on('error', fail)
  req.on('error', () => proxied.destroy())
  res.on('error', () => proxied.destroy())
  req.pipe(proxied)
}

/** Server estático que replica nginx prod: gzip + proxy API + fallback SPA. */
function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x')
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
        return proxyToBackend(req, res)
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
      if ((req.headers['accept-encoding'] || '').includes('gzip') && COMPRESSIBLE.has(ext)) {
        headers['content-encoding'] = 'gzip'
        res.writeHead(200, headers)
        res.end(gzipSync(buf))
      } else {
        res.writeHead(200, headers)
        res.end(buf)
      }
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)))
}

async function loginAndGetSession() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${HOST}/login`, { waitUntil: 'domcontentloaded' })
  // Admin para cubrir rutas autenticadas + /admin en la auditoría.
  await page.locator('#email, input[type=email]').first().fill('admin@genova.ai')
  await page.locator('#password input, input[type=password]').first().fill('admin1234password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 })

  // Con la sesión viva, tomar el id de la primera OVA para poder auditar el
  // editor (workspace/:id). Same-origin fetch → la cookie httpOnly viaja sola.
  const ovaId = await page
    .evaluate(async () => {
      try {
        const res = await fetch('/api/ovas?page=1&limit=1', { credentials: 'include' })
        if (!res.ok) return null
        const data = await res.json()
        return data?.ovas?.[0]?.id ?? null
      } catch {
        return null
      }
    })
    .catch(() => null)

  const cookies = await context.cookies()
  await browser.close()
  return { cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join('; '), ovaId }
}

// Async (spawn, NO spawnSync): el server estático corre en ESTE mismo proceso;
// spawnSync bloquearía el event loop y el server no respondería a Lighthouse
// (la página colgaría). Con spawn el loop sigue libre para servir.
async function runLh(url, id, extraFlags = []) {
  const outBase = path.join(lhDir, id)
  const args = [
    'lighthouse',
    url,
    '--quiet',
    '--chrome-flags=--headless --no-sandbox',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=html',
    '--output=json',
    `--output-path=${outBase}`,
    ...extraFlags,
  ]
  console.log('Lighthouse', id, url)
  // Borrar el reporte previo para que el chequeo de "existe" tras un exit≠0 no
  // dé un falso positivo con un JSON viejo.
  await rm(`${outBase}.report.json`, { force: true })
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', args, { cwd: root, shell: true, stdio: 'inherit' })
    proc.on('error', reject)
    proc.on('exit', (code) => {
      // chrome-launcher a veces sale con EPERM al borrar su temp dir en Windows
      // DESPUÉS de escribir el reporte. Si el JSON existe, la auditoría fue OK.
      if (code === 0) return resolve()
      stat(`${outBase}.report.json`)
        .then(() => {
          console.warn(`  (exit ${code} ignorado: reporte de ${id} sí se generó)`)
          resolve()
        })
        .catch(() => reject(new Error(`Lighthouse failed for ${id}: ${code}`)))
    })
  })
}

async function shotScores(htmlPath, pngPath) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: pngPath, fullPage: false })
  await browser.close()
  console.log('OK', pngPath)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await mkdir(lhDir, { recursive: true })

  buildProd()
  const server = await startStaticServer()
  console.log(`Server estático (gzip + proxy → ${BACKEND}) en ${HOST}`)

  try {
    let cookieHeader = ''
    let ovaId = null
    try {
      ;({ cookieHeader, ovaId } = await loginAndGetSession())
    } catch (e) {
      console.warn('Auth cookie failed (¿backend en :8000?):', e.message)
    }

    // Rutas con :id cableadas dinámicamente:
    //  - engage/:id es pública e ignora el id (renderiza la fase ENGAGE) → siempre.
    //  - workspace/:id (editor OVA) necesita un id real; solo si el admin tiene OVAs.
    const allPages = [...pages, { id: 'engage', url: `${HOST}/engage/${ovaId ?? 'preview'}` }]
    if (ovaId) {
      allPages.push({ id: 'workspace', url: `${HOST}/workspace/${ovaId}`, auth: true })
    } else {
      console.warn('Skip workspace/:id — el admin no tiene OVAs para auditar el editor.')
    }

    const summary = []
    for (const p of allPages) {
      const extra = []
      if (p.auth) {
        if (!cookieHeader) {
          console.warn('Skip', p.id)
          continue
        }
        const hdrFile = path.join(lhDir, 'extra-headers.json')
        await writeFile(hdrFile, JSON.stringify({ Cookie: cookieHeader }), 'utf8')
        extra.push(`--extra-headers=${hdrFile}`)
      }
      await runLh(p.url, p.id, extra)
      const html = path.join(lhDir, `${p.id}.report.html`)
      const json = path.join(lhDir, `${p.id}.report.json`)
      await shotScores(html, path.join(outDir, `lighthouse-${p.id}.png`))
      const report = JSON.parse(await readFile(json, 'utf8'))
      const cats = report.categories || {}
      const row = {
        id: p.id,
        url: p.url,
        performance: Math.round((cats.performance?.score || 0) * 100),
        accessibility: Math.round((cats.accessibility?.score || 0) * 100),
        bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
        seo: Math.round((cats.seo?.score || 0) * 100),
      }
      summary.push(row)
      console.log(JSON.stringify(row))
    }

    await writeFile(path.join(outDir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2), 'utf8')
    console.log('Summary written')
  } finally {
    server.close()
  }
}

// Red de seguridad: un error tardío en un socket abortado (proxy/gzip durante
// una recarga de Lighthouse) no debe tumbar el server a mitad de auditoría.
process.on('uncaughtException', (e) => console.warn('uncaughtException (ignorado):', e.message))

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
