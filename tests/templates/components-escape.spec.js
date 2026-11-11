import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// getAttribute() devuelve el valor decodificado: el esc() de la plantilla no basta
// si el componente lo vuelve a interpolar en el innerHTML de su shadow root.
const runtime = readFileSync(new URL('../../backend/llm/ova_components/upao_components.js', import.meta.url), 'utf8');
const markup = '<img src=x onerror="window.pwn=1">';
const breakout = 'x" onclick="window.pwn=2';
// Mismo escape que ova_engine.html.esc (html.escape con quote=True).
const esc = v => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ATTRS = {
  'upao-card': ['eyebrow', 'title', 'subtitle'],
  'upao-node': ['number', 'title', 'label'],
  'upao-choice': ['value', 'feedback', 'group'],
  'upao-reveal': ['label'],
  'upao-progress': ['label'],
  'upao-timer': ['label'],
  'upao-score': ['label', 'max'],
  'upao-nav': ['prev-label', 'next-label'],
  'upao-comic-panel': ['number', 'character', 'img-alt'],
  'upao-podcast': ['concept', 'transcript'],
  'upao-drag-item': ['item-id', 'category'],
  'upao-drop-zone': ['label'],
  'upao-complete': ['label'],
};

function poisonedBody() {
  return Object.entries(ATTRS).flatMap(([tag, attrs]) => attrs.flatMap(attr => [markup, breakout].map(value =>
    `<${tag} ${attr}="${esc(value)}">Texto</${tag}>`))).join('\n')
    + `\n<upao-comic-panel img-src="${esc(`https://example.org/a.png${breakout}`)}">Escena</upao-comic-panel>`;
}

test('los atributos de texto de los componentes UPAO nunca se vuelven marcado', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent(`<!doctype html><html lang="es"><head></head><body>${poisonedBody()}</body></html>`);
  await page.addScriptTag({ content: runtime });
  const report = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('*')].filter(el => el.shadowRoot);
    const injected = hosts.flatMap(el => [...el.shadowRoot.querySelectorAll('[onerror], [onclick], img[src="x"], script')]
      .map(node => `${el.localName}: ${node.outerHTML.slice(0, 80)}`));
    const feedback = document.querySelector('upao-choice[feedback]').shadowRoot.querySelector('.fb').textContent;
    return { hosts: hosts.length, injected, feedback, pwn: window.pwn ?? null };
  });
  expect(report.hosts).toBeGreaterThan(40);
  expect(report.injected).toEqual([]);
  expect(report.pwn).toBeNull();
  expect(report.feedback).toBe(markup);
  expect(errors).toEqual([]);
});
