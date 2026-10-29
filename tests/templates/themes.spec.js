import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { completeResource } from './interactions.js';

// Accesibilidad (WCAG 2 AA) de las 51 plantillas con cada tema de paquete. Las copias
// `.ova-rendered/<tema>/<recurso>.html` las genera `ova_engine_render.py` con el mismo
// `inject_package_theme` del exportador, así que no hay lógica de temas que duplicar aquí.
const themes = ['upao', 'claro', 'oscuro', 'alto-contraste', 'infantil'];
const fixtures = readdirSync(new URL('../../backend/tests/fixtures/ova_engine/', import.meta.url))
  .filter(f => /^(engage|explore|explain|elaborate|evaluate)_\d\d\.json$/.test(f)).sort();

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/([^/]*\.)?geogebra\.org\//, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  });
});

for (const theme of themes) {
  for (const fixture of fixtures) {
    const id = fixture.replace('.json', '');
    test(`${id} con el tema ${theme}: sin fallos de axe`, async ({ page }, info) => {
      await page.goto(`/.ova-rendered/${theme}/${id}.html`);
      if (id === 'explore_11') await page.clock.runFor(3000);
      const audit = await new AxeBuilder({ page }).analyze();
      await info.attach('axe', { body: JSON.stringify(audit.violations, null, 2), contentType: 'application/json' });
      expect(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact)),
        JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), null, 2)).toEqual([]);
    });
    test(`${id} con el tema ${theme}: sin fallos de axe tras completar`, async ({ page }, info) => {
      await page.goto(`/.ova-rendered/${theme}/${id}.html`);
      if (id === 'explore_11') {
        await page.clock.runFor(3000);
        await expect(page.locator('#ggb-fallback')).toBeVisible();
      }
      await completeResource(page, id);
      await expect(page.locator('upao-complete button')).toBeEnabled();
      const audit = await new AxeBuilder({ page }).analyze();
      await info.attach('axe-completado', { body: JSON.stringify(audit.violations, null, 2), contentType: 'application/json' });
      expect(audit.violations.filter(v => ['serious', 'critical'].includes(v.impact)),
        JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), null, 2)).toEqual([]);
    });
  }
}
