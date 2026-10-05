import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { completeResource } from './interactions.js';

const fixtures = readdirSync(new URL('../../backend/tests/fixtures/ova_engine/', import.meta.url))
  .filter(f => /^(engage|explore|explain|elaborate|evaluate)_\d\d\.json$/.test(f)).sort();
if (fixtures.length !== 51) throw new Error(`Se esperaban 51 fixtures, hay ${fixtures.length}`);
const screenshotFonts = `
@font-face{font-family:Reference;src:url(/templates/fonts/DejaVuSans.ttf);font-weight:400}
@font-face{font-family:Reference;src:url(/templates/fonts/DejaVuSans-Bold.ttf);font-weight:600 900}
@font-face{font-family:ReferenceMono;src:url(/templates/fonts/DejaVuSansMono.ttf)}
@font-face{font-family:ReferenceEmoji;src:url(/templates/fonts/NotoEmoji.ttf);font-weight:300 700}
:root{--font-body:Reference,ReferenceEmoji;--font-display:Reference,ReferenceEmoji;--font-mono:ReferenceMono,ReferenceEmoji}
*{font-family:Reference,ReferenceEmoji!important}
pre,pre *,code,code *,.k-code,.k-code-in{font-family:ReferenceMono,ReferenceEmoji!important}`;

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  });
});

for (const fixture of fixtures) {
  const id = fixture.replace('.json', '');
  test(`${id} accesibilidad y referencias`, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`/.ova-rendered/${id}.html`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const audit = await new AxeBuilder({ page }).analyze();
      await info.attach(`axe-${width}`, { body: JSON.stringify(audit.violations, null, 2), contentType: 'application/json' });
      expect(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact)),
        JSON.stringify(audit.violations, null, 2)).toEqual([]);
      const style = await page.addStyleTag({ content: screenshotFonts });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${id}-${width}.png`, { fullPage: true });
      await style.evaluate(el => el.remove());
    }
    expect(errors).toEqual([]);
  });
  test(`${id} interacción principal solo con teclado`, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`/.ova-rendered/${id}.html`);
    await expect(page.locator('upao-complete button')).toBeDisabled();
    await completeResource(page, id);
    await expect(page.locator('upao-complete button')).toBeEnabled();
    const audit = await new AxeBuilder({ page }).analyze();
    await info.attach('axe-completado', { body: JSON.stringify(audit.violations, null, 2), contentType: 'application/json' });
    expect(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact))).toEqual([]);
    expect(errors).toEqual([]);
  });
}
