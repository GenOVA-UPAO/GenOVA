/**
 * Ejecuta Lighthouse contra pantallas clave y guarda HTML/JSON + PNG de scores.
 * Uso: node tests/run-lighthouse.mjs  (requiere frontend en :4200)
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs/assets/usabilidad')
const lhDir = path.join(root, 'tests/lighthouse-reports')

const pages = [
  { id: 'login', url: 'http://localhost:4200/login' },
  { id: 'register', url: 'http://localhost:4200/register' },
  { id: 'dashboard', url: 'http://localhost:4200/dashboard', auth: true },
]

async function loginAndGetCookieHeader() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('http://localhost:4200/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#email, input[type=email]').first().fill('user@genova.ai')
  await page.locator('#password input, input[type=password]').first().fill('user1234password')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 })
  const cookies = await context.cookies()
  await browser.close()
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

function runLh(url, id, extraFlags = []) {
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
  const r = spawnSync('npx', args, { cwd: root, shell: true, encoding: 'utf8' })
  if (r.status !== 0) {
    console.error(r.stdout)
    console.error(r.stderr)
    throw new Error(`Lighthouse failed for ${id}: ${r.status}`)
  }
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

  let cookieHeader = ''
  try {
    cookieHeader = await loginAndGetCookieHeader()
  } catch (e) {
    console.warn('Auth cookie failed:', e.message)
  }

  const summary = []
  for (const p of pages) {
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
    runLh(p.url, p.id, extra)
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
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
