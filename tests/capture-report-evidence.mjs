/**
 * Captura evidencia PNG de reportes HTML (Locust, JMeter, cucumber, comparativa).
 * Uso (desde repo root o tests/): node tests/capture-report-evidence.mjs
 */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function shot(page, filePath, outPath, fullPage = true) {
  await mkdir(path.dirname(outPath), { recursive: true })
  await page.goto(pathToFileURL(filePath).href, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: outPath, fullPage })
  console.log('OK', outPath)
}

async function main() {
  const cmp = path.join(root, 'docs/assets/carga/comparativa.html')
  await mkdir(path.dirname(cmp), { recursive: true })
  await writeFile(
    cmp,
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Comparativa</title>
<style>body{font-family:Segoe UI,sans-serif;padding:32px;background:#0b1220;color:#e5e7eb}
h1{font-size:1.4rem} table{border-collapse:collapse;width:100%;margin-top:16px}
th,td{border:1px solid #334155;padding:10px 12px;text-align:left} th{background:#1e293b}
.ok{color:#4ade80}.bad{color:#f87171} .num{text-align:right}</style></head><body>
<h1>Comparativa Locust vs JMeter — 25 usuarios · 2 min · localhost:8000</h1>
<table>
<tr><th>Métrica / Endpoint</th><th>Locust</th><th>JMeter</th></tr>
<tr><td>Peticiones totales</td><td class="num">1 539</td><td class="num">1 266</td></tr>
<tr><td>Errores</td><td class="num ok">0 (0 %)</td><td class="num ok">0 (0 %)</td></tr>
<tr><td>Throughput agregado</td><td class="num">12.92 req/s</td><td class="num">10.50 req/s</td></tr>
<tr><td>GET /health P50 / P90</td><td class="num">5 / 9 ms</td><td class="num">5 / 10 ms</td></tr>
<tr><td>GET /api/ovas P50 / P90</td><td class="num">770 / 820 ms</td><td class="num">771 / 825 ms</td></tr>
<tr><td>POST /api/auth/login P50 / P90</td><td class="num">990 / 1 100 ms</td><td class="num">1 006 / 1 480 ms</td></tr>
<tr><td>POST /api/auth/register P50 / P90</td><td class="num">2 400 / 2 500 ms</td><td class="num">2 388 / 2 577 ms</td></tr>
<tr><td>GET /health ≤ 278 ms (RN-001)</td><td class="ok">Sí</td><td class="ok">Sí</td></tr>
<tr><td>Endpoints con BD ≤ 278 ms</td><td class="bad">No (latencia local→Supabase)</td><td class="bad">No (latencia local→Supabase)</td></tr>
</table>
<p style="margin-top:16px;color:#94a3b8">Fecha: 18/07/2026 · LOAD_GENERATION=0</p>
</body></html>`,
    'utf8',
  )

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

  await shot(
    page,
    path.join(root, 'tests/load/report.html'),
    path.join(root, 'docs/assets/carga/locust-html-resumen.png'),
    true,
  )
  await shot(
    page,
    path.join(root, 'tests/load/jmeter-report/index.html'),
    path.join(root, 'docs/assets/carga/jmeter-dashboard.png'),
    false,
  )
  await page.goto(pathToFileURL(path.join(root, 'tests/load/jmeter-report/index.html')).href, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(500)
  const statsLink = page.locator('a[href="#statistics"]')
  if ((await statsLink.count()) > 0) {
    await statsLink.first().click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(800)
  }
  await page.screenshot({
    path: path.join(root, 'docs/assets/carga/jmeter-aggregate.png'),
    fullPage: false,
  })
  console.log('OK jmeter-aggregate.png')

  await shot(
    page,
    path.join(root, 'docs/assets/unit-bdd/cucumber-unit-resumen.html'),
    path.join(root, 'docs/assets/unit-bdd/cucumber-unit-resumen.png'),
    false,
  )
  await shot(page, cmp, path.join(root, 'docs/assets/carga/comparativa-tabla.png'), false)

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
