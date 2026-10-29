import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

// H5P exportado por GenOVA en mod_h5pactivity real: Moodle valida el paquete con
// las librerías del Hub, lo muestra, y registra el intento vía xAPI en sus tablas.
const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.env.MOODLE_EVIDENCE || `${root}/tests/test-results/moodle-h5p`);
mkdirSync(output, { recursive: true });
const moodle = process.env.MOODLE_URL || `http://localhost:${process.env.MOODLE_PORT || 8081}`;
const compose = ['compose', '-f', 'docker-compose.moodle.yml'];
const docker = args => execFileSync('docker', [...compose, ...args], { encoding: 'utf8', cwd: root }).trim();
const ids = JSON.parse(docker(['exec', '-T', '-u', 'www-data', 'moodle', 'php', '/opt/genova/provision_h5p.php']).split('\n').at(-1));
const attempts = () => docker(['exec', '-T', 'db', 'psql', '-U', 'moodle', '-d', 'moodle', '-At', '-c',
  `SELECT a.attempt, a.rawscore, a.maxscore, a.completion, a.success, count(r.id) FROM mdl_h5pactivity_attempts a
   LEFT JOIN mdl_h5pactivity_attempts_results r ON r.attemptid = a.id
   WHERE a.h5pactivityid = ${ids.h5pactivity} AND a.userid = ${ids.user} GROUP BY a.id ORDER BY a.attempt`]);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.setDefaultTimeout(60_000);
const login = async username => {
  await page.goto(`${moodle}/login/index.php`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('Genova-CI-2026!');
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/login/index.php', { waitUntil: 'domcontentloaded' }),
    page.locator('#loginbtn').click(),
  ]);
};
const content = () => page.frames().find(f => f.url() === 'about:blank' && f.parentFrame()?.url().includes('/h5p/embed.php'));
try {
  await login('alumno');
  await page.goto(`${moodle}/mod/h5pactivity/view.php?id=${ids.cm}`, { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => (await content()?.locator('.h5p-column-content').count()) ?? 0, { timeout: 60_000 }).toBeGreaterThan(0);
  const h5p = content();
  // Validación de Moodle superada: no hay mensajes de paquete inválido y están las cuatro actividades.
  const embedText = await h5p.parentFrame().locator('body').innerText();
  expect(embedText).not.toMatch(/missing-required-property|invalid-h5p|not valid/i);
  for (const cls of ['.h5p-multichoice', '.h5p-blanks', '.h5p-drag-text']) {
    expect(await h5p.locator(cls).count(), cls).toBeGreaterThan(0);
  }
  await page.screenshot({ path: `${output}/01-alumno-actividad.png`, fullPage: true });
  // H5P.Column emite el xAPI «completed» (el que Moodle guarda como intento) solo
  // cuando se han comprobado todas sus actividades: se responden todas.
  for (const q of await h5p.locator('.h5p-multichoice').all()) {
    await q.locator('.h5p-answer').first().click();
    await q.locator('.h5p-question-check-answer').click();
  }
  for (const q of await h5p.locator('.h5p-blanks').all()) {
    for (const input of await q.locator('input.h5p-text-input').all()) await input.fill('x');
    await q.locator('.h5p-question-check-answer').click();
  }
  for (const q of await h5p.locator('.h5p-drag-text').all()) await q.locator('.h5p-question-check-answer').click();
  await expect(h5p.locator('.h5p-question-check-answer:visible')).toHaveCount(0);
  await page.screenshot({ path: `${output}/02-actividades-comprobadas.png`, fullPage: true });
  await expect.poll(attempts, { timeout: 30_000 }).not.toBe('');
  const tracked = attempts();
  writeFileSync(`${output}/intentos.txt`, tracked + '\n');
  // attempt|rawscore|maxscore|completion|success|resultados: intento completado con puntuación máxima > 0.
  expect(tracked).toMatch(/^\d+\|\d+\|[1-9]\d*\|1\|/m);
  await page.context().clearCookies();
  await login('admin');
  await page.goto(`${moodle}/mod/h5pactivity/report.php?a=${ids.h5pactivity}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('Alumno GenOVA');
  await page.screenshot({ path: `${output}/03-informe-moodle.png`, fullPage: true });
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ids, tracked, result: 'passed', verifiedAt: new Date().toISOString() }, null, 2));
  console.log(tracked);
} catch (error) {
  await page.screenshot({ path: `${output}/fallo.png`, fullPage: true }).catch(() => {});
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ids, result: 'failed', error: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
