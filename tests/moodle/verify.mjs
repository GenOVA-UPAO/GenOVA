import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { completeResource, activate } from '../templates/interactions.js';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.env.MOODLE_EVIDENCE || `${root}/tests/test-results/moodle`);
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/resultado.json`, JSON.stringify({ result: 'running', startedAt: new Date().toISOString() }));
const compose = ['compose', '-f', 'docker-compose.moodle.yml'];
const docker = args => execFileSync('docker', [...compose, ...args], { encoding: 'utf8', cwd: root }).trim();
const ids = process.env.MOODLE_IDS ? JSON.parse(process.env.MOODLE_IDS)
  : JSON.parse(docker(['exec', '-T', 'moodle', 'php', '/opt/genova/provision.php']).split('\n').at(-1));
const query = `SELECT e.element,v.value FROM mdl_scorm_scoes_value v JOIN mdl_scorm_element e ON e.id=v.elementid JOIN mdl_scorm_attempt a ON a.id=v.attemptid WHERE a.userid=${ids.user} AND a.scormid=${ids.scorm} AND a.attempt=1 ORDER BY e.element`;
const tracks = () => docker(['exec', '-T', 'db', 'psql', '-U', 'moodle', '-d', 'moodle', '-At', '-c', query]);
const before = tracks();
const totalTime = text => {
  const value = /cmi.core.total_time\|(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  return value ? Number(value[1]) * 3600 + Number(value[2]) * 60 + Number(value[3]) : 0;
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(60_000);
const login = async (username) => {
  await page.goto('http://localhost:8081/login/index.php', { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('Genova-CI-2026!');
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/login/index.php', { waitUntil: 'domcontentloaded' }),
    page.locator('#loginbtn').click(),
  ]);
};
try {
  await login('alumno');
  await page.goto(`http://localhost:8081/mod/scorm/view.php?id=${ids.cm}`, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `${output}/01-alumno-actividad.png`, fullPage: true });
  // Abrir el reproductor autenticado del módulo evita depender del tipo de
  // control de entrada que renderiza cada versión/tema de Moodle.
  await page.goto(`http://localhost:8081/mod/scorm/player.php?a=${ids.scorm}&scoid=${ids.sco}&currentorg=ORG-DEFAULT&mode=normal`, { waitUntil: 'domcontentloaded' });
  // Moodle puede usar iframe o embed. Buscar la ventana del SCO por URL real.
  await expect.poll(() => page.frames().find(f => /\/index\.html/.test(f.url()))?.url(), { timeout: 30_000 }).toBeTruthy();
  const sco = page.frames().find(f => /\/index\.html/.test(f.url()));
  const names = ['engage_01', 'elaborate_04', 'evaluate_01'];
  for (let i = 0; i < names.length; i++) {
    if (i) await sco.locator('[role="tab"]').nth(i).click();
    const resource = sco.frameLocator('#res-frame');
    await expect(resource.locator('upao-complete button')).toBeDisabled();
    // Helpers reales usan Tab/Enter del Page, contra locators del Frame.
    const frame = page.frames().find(f => f.parentFrame() === sco && /recurso_/.test(f.url()));
    const driver = { locator: selector => frame.locator(selector), keyboard: page.keyboard,
      // Estos tres recursos no tienen temporizadores; no alterar el reloj del LMS.
      clock: { runFor: async () => {} } };
    await completeResource(driver, names[i]);
    await activate(driver, 'upao-complete button');
    await page.screenshot({ path: `${output}/0${i + 2}-${names[i]}-completado.png`, fullPage: true });
  }
  await expect(sco.locator('#scorm-status')).toContainText('completado y guardado');
  await page.waitForTimeout(1500);
  await page.goto('http://localhost:8081/my/'); // descarga el SCO: LMSFinish acumula total_time
  await ctx.clearCookies();
  await login('admin');
  await page.goto(`http://localhost:8081/mod/scorm/report.php?id=${ids.cm}`);
  await expect(page.locator('body')).toContainText('Alumno GenOVA');
  await page.screenshot({ path: `${output}/05-informe-moodle.png`, fullPage: true });
  await page.getByRole('link', { name: '1', exact: true }).click();
  await expect(page.locator('body')).toContainText(/Completed|Passed|Completado/i);
  await expect(page.locator('body')).toContainText(/Time|Tiempo/i);
  await expect(page.locator('body')).toContainText('100');
  writeFileSync(`${output}/informe-moodle.txt`, await page.locator('body').innerText());
  await page.screenshot({ path: `${output}/06-detalle-intento.png`, fullPage: true });
  await page.getByRole('link', { name: 'Track details', exact: true }).click();
  await expect(page.locator('body')).toContainText('cmi.core.lesson_status');
  await expect(page.locator('body')).toContainText('cmi.core.score.raw');
  await page.screenshot({ path: `${output}/07-cmi-core.png`, fullPage: true });
  // Evidencia durable leída del almacenamiento SCORM de Moodle, no del objeto API.
  const tracked = tracks();
  writeFileSync(`${output}/cmi-core.txt`, tracked + '\n');
  expect(tracked).toMatch(/cmi.core.lesson_status\|(completed|passed)/);
  expect(tracked).toMatch(/cmi.core.score.raw\|\d+/);
  expect(tracked).toMatch(/cmi.core.total_time\|[0-9:.]+/);
  expect(tracked).not.toMatch(/cmi.core.total_time\|0+:00:00(?:\.00)?(?:\n|$)/);
  expect(totalTime(tracked)).toBeGreaterThan(totalTime(before));
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ids, before, tracked, result: 'passed', verifiedAt: new Date().toISOString() }, null, 2));
  console.log(tracked);
} catch (error) {
  await page.screenshot({ path: `${output}/fallo.png`, fullPage: true }).catch(() => {});
  writeFileSync(`${output}/fallo.txt`, `${page.url()}\n${await page.locator('body').innerText().catch(() => '')}\n${error.stack}`);
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ids, result: 'failed', error: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
