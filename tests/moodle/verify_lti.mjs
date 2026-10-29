import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { completeResource, activate } from '../templates/interactions.js';

// LTI 1.3 de punta a punta contra Moodle real (ver README): Deep Linking del docente,
// lanzamiento del alumno dentro de Moodle y nota publicada por AGS en el libro de calificaciones.
// Requiere el backend de GenOVA en GENOVA_URL con la plataforma registrada (lti_register_platform.py)
// y la OVA sembrada (lti_seed_genova.py); LTI_IDS = salida de provision_lti.php.
const root = resolve(import.meta.dirname, '../..');
const output = resolve(process.env.MOODLE_EVIDENCE || `${root}/tests/test-results/moodle-lti`);
mkdirSync(output, { recursive: true });
const moodle = process.env.MOODLE_URL || `http://localhost:${process.env.MOODLE_PORT || 8081}`;
const genova = process.env.GENOVA_URL || 'http://localhost:8000';
const lti = JSON.parse(process.env.LTI_IDS);
const compose = ['compose', '-f', 'docker-compose.moodle.yml'];
const docker = args => execFileSync('docker', [...compose, ...args], { encoding: 'utf8', cwd: root }).trim();
const sql = query => docker(['exec', '-T', 'db', 'psql', '-U', 'moodle', '-d', 'moodle', '-At', '-c', query]);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(60_000);
const login = async username => {
  await ctx.clearCookies();
  await page.goto(`${moodle}/login/index.php`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(username);
  await page.locator('#password').fill('Genova-CI-2026!');
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/login/index.php', { waitUntil: 'domcontentloaded' }),
    page.locator('#loginbtn').click(),
  ]);
};
const result = { lti };
try {
  // 1. Deep Linking: el docente elige su OVA en GenOVA y Moodle valida la respuesta firmada.
  await login('docente');
  await page.goto(`${moodle}/mod/lti/contentitem.php?id=${lti.typeid}&course=${lti.course}&title=GenOVA`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(url => url.href.startsWith(`${genova}/lti/deep-link/`));
  await expect(page.locator('body')).toContainText('OVA LTI CI');
  await page.screenshot({ path: `${output}/01-docente-selector-genova.png`, fullPage: true });
  const radio = page.getByRole('radio').first();
  if (await radio.count()) await radio.check();
  await page.getByRole('button', { name: 'Añadir al curso' }).click();
  await page.waitForURL(url => url.pathname === '/mod/lti/contentitem_return.php', { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  const init = /require\(\['mod_lti\/contentitem_return'\], function\(amd\) \{amd\.init\((\{.*?\})\);/s.exec(html);
  expect(init, 'Moodle aceptó la respuesta de Deep Linking').toBeTruthy();
  const item = JSON.parse(init[1]);
  expect(item.toolurl).toBe(`${genova}/lti/launch`);
  expect(item.instructorcustomparameters).toMatch(/^ova_id=[0-9a-f-]{36}$/);
  expect(Number(item.grade_modgrade_point)).toBe(100);
  result.deepLinkItem = item;

  // 2. La actividad con esos datos (lo que guarda el formulario de Moodle).
  const activity = JSON.parse(docker(['exec', '-T', '-u', 'www-data', 'moodle', 'php', '/opt/genova/provision_lti_activity.php',
    JSON.stringify(item), String(lti.typeid)]).split('\n').at(-1));
  result.activity = activity;

  // 3. El alumno lanza la OVA dentro de Moodle y completa sus recursos con teclado.
  await login('alumno');
  await page.goto(`${moodle}/mod/lti/view.php?id=${activity.cm}`, { waitUntil: 'domcontentloaded' });
  const player = () => page.frames().find(f => /\/lti\/play\/[^/]+\/$/.test(f.url()));
  const shell = () => page.frames().find(f => f.url().endsWith('/content/index.html'));
  await expect.poll(() => shell()?.url(), { timeout: 60_000 }).toBeTruthy();
  await expect(player().locator('body')).toContainText('tu nota se enviará al LMS');
  const sco = shell();
  const names = ['engage_01', 'evaluate_01'];
  for (let i = 0; i < names.length; i++) {
    if (i) await sco.locator('[role="tab"]').nth(i).click();
    await expect.poll(() => page.frames().find(f => f.parentFrame() === sco && /recurso_/.test(f.url()))?.url()).toMatch(new RegExp(`recurso_${i + 1}`));
    const frame = page.frames().find(f => f.parentFrame() === sco && /recurso_/.test(f.url()));
    const driver = { locator: selector => frame.locator(selector), keyboard: page.keyboard, clock: { runFor: async () => {} } };
    await completeResource(driver, names[i]);
    await activate(driver, 'upao-complete button');
    await page.screenshot({ path: `${output}/0${i + 2}-alumno-${names[i]}.png`, fullPage: true });
  }
  await expect(player().locator('body')).toContainText(/Nota enviada al LMS: \d+/, { timeout: 30_000 });
  result.playerStatus = (await player().locator('body').innerText()).split('\n').find(l => /Nota enviada/.test(l));

  // 4. La nota está en el libro de calificaciones de Moodle (AGS → mdl_grade_grades).
  const grade = () => sql(`SELECT g.finalgrade FROM mdl_grade_grades g JOIN mdl_grade_items i ON i.id = g.itemid
    WHERE i.itemmodule = 'lti' AND i.iteminstance = ${activity.lti} AND g.userid = ${activity.student}`);
  await expect.poll(grade, { timeout: 30_000 }).toMatch(/^\d+(\.\d+)?$/);
  result.moodleGrade = grade();
  await login('docente');
  await page.goto(`${moodle}/grade/report/grader/index.php?id=${lti.course}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toContainText('Alumno GenOVA');
  await page.screenshot({ path: `${output}/04-libro-calificaciones.png`, fullPage: true });
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ...result, result: 'passed', verifiedAt: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ playerStatus: result.playerStatus, moodleGrade: result.moodleGrade }));
} catch (error) {
  await page.screenshot({ path: `${output}/fallo.png`, fullPage: true }).catch(() => {});
  writeFileSync(`${output}/resultado.json`, JSON.stringify({ ...result, result: 'failed', error: error.message }, null, 2));
  throw error;
} finally {
  await browser.close();
}
