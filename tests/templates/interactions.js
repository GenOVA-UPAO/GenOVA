import { expect } from '@playwright/test';

// Tab real, incluso dentro de Shadow DOM; no focus(), click(), eventos sintéticos,
// ovaMark(), unlock() ni mutaciones del progreso desde el harness.
export async function tabTo(page, target) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 400; i++) {
    if (await target.evaluate(el => {
      let active = el.ownerDocument.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active === el;
    })) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`No alcanzable mediante Tab: ${await target.evaluate(el => el.outerHTML)}`);
}

export async function activate(page, selector) {
  const target = typeof selector === 'string' ? page.locator(selector).first() : selector;
  await tabTo(page, target);
  const checkbox = await target.evaluate(el => el.matches('input[type="checkbox"],input[type="radio"]'));
  await page.keyboard.press(checkbox ? 'Space' : 'Enter');
}

async function all(page, selector) {
  for (const loc of await page.locator(selector).all()) {
    if (await loc.isVisible() && await loc.isEnabled()) await activate(page, loc);
  }
}

async function stableAll(page, selector) {
  const ids = await page.locator(selector).evaluateAll(els => els.map(el => {
    if (!el.dataset.ciControl) el.dataset.ciControl = String(window.__ciControl = (window.__ciControl || 0) + 1);
    return el.dataset.ciControl;
  }));
  return ids.map(id => page.locator(`[data-ci-control="${id}"]`));
}

export async function completeResource(page, id) {
  // Helpers por mecánica; las respuestas se leen del mismo contrato de fixtures
  // usado al renderizar, nunca se sustituye la lógica de interacción.
  const data = await page.locator('#ova-data').count()
    ? await page.locator('#ova-data').evaluate(el => JSON.parse(el.textContent)) : null;
  if (id === 'explore_11') {
    // Solo los controles propios (consignas y verificación); el applet de GeoGebra no se usa.
    for (const [k, c] of data.consignas.entries()) {
      await tabTo(page, page.locator(`#in-${k + 1}`));
      await page.keyboard.insertText(c.respuesta_esperada);
      await activate(page, `#btn-${k + 1}`);
    }
    return;
  }
  if (id === 'evaluate_11') {
    while (await page.locator('#ad-active-section').isVisible()) {
      const stem = await page.locator('#ad-enunciado').textContent();
      const q = Object.values(data.banco).flat().find(x => x.enunciado === stem);
      const idx = q.opciones.findIndex(o => o.correcta);
      await activate(page, page.locator('#ad-opts button').nth(idx));
      await activate(page, '#ad-confirm-btn');
      await activate(page, '#ad-next-btn');
    }
    return;
  }
  if (id === 'explain_04') {
    await all(page, 'upao-node .head');
    await page.clock.runFor(400);
    return;
  }
  if (id === 'explore_02') {
    const turns = await page.locator('.socratic-turn').count();
    for (let i = 1; i <= turns; i++) {
      await activate(page, page.locator(`#turn-${i} .socratic-opt-btn`).first());
      if (i < turns) await activate(page, `#next-btn-${i}`);
    }
    return;
  }
  if (['explore_04', 'explore_07'].includes(id)) {
    for (const choice of await page.locator('upao-choice[correct="true"] button').all()) {
      await activate(page, choice);
      if (id === 'explore_04') {
        const next = page.locator('.btn-next-step:visible');
        if (await next.count()) await activate(page, next.last());
      }
    }
    if (id === 'explore_04') await activate(page, '#btn-copy-prompt');
    return;
  }
  if (id === 'explore_08') {
    const panels = await page.locator('.scenario-panel').count();
    for (let i = 1; i <= panels; i++) {
      await activate(page, `upao-choice[group="scenario-${i}"][correct="true"] button`);
      if (i < panels) await activate(page, 'upao-nav #next');
    }
    return;
  }
  if (id === 'explore_03') {
    const game = await page.locator('#drag-game-data').evaluate(el => JSON.parse(el.textContent));
    for (const [itemId, item] of Object.entries(game.items))
      await activate(page, `.btn-classify[data-item-id="${itemId}"][data-target-cat="${item.categoria}"]`);
    return;
  }
  if (id === 'explore_09') {
    for (const hint of await page.locator('.clue-card').all()) {
      const card = await hint.getAttribute('data-card-id');
      await activate(page, hint);
      await activate(page, `.tech-card[data-card-id="${card}"]`);
    }
    return;
  }
  if (id === 'explore_10') {
    const count = await page.locator('#trial-select option').count();
    for (let i = 0; i < count; i++) {
      await tabTo(page, page.locator('#trial-select'));
      await page.keyboard.press('Home');
      for (let j = 0; j < i; j++) await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await activate(page, '#btn-run-trial');
    }
    await activate(page, 'upao-choice[correct="true"] button');
    return;
  }
  if (id === 'elaborate_09') {
    for (const turn of data.t) {
      const best = turn.o.find(o => o.q === 2) || turn.o[0];
      await activate(page, page.locator('#ge-opts button').filter({ hasText: best.t }));
      await activate(page, '#ge-next');
    }
    return;
  }
  if (['engage_02', 'explain_01'].includes(id)) {
    await activate(page, '#btn-mark-all');
    await activate(page, '#btn-copy-prompt');
    return;
  }
  if (id === 'engage_06') {
    await tabTo(page, page.locator('#tab-step-1'));
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await activate(page, '#reveal-analisis button');
    return;
  }
  if (id === 'engage_09') {
    const total = await page.locator('.btn-choice[data-correct="true"]').count();
    for (let i = 0; i < total; i++) {
      await activate(page, page.locator('.btn-choice[data-correct="true"]').nth(i));
      const next = page.locator('.btn-next-step:visible');
      if (await next.count()) await activate(page, next);
    }
    return;
  }
  if (['evaluate_03', 'evaluate_04'].includes(id)) {
    if (id === 'evaluate_03') await activate(page, '#btn-start');
    for (const [i, q] of data.qs.entries()) {
      await activate(page, page.locator('#q-opts button').nth(q.c));
      if (id === 'evaluate_03') await page.clock.runFor(1000);
      if (id === 'evaluate_03' || i + 1 < data.qs.length) await activate(page, '#btn-next');
    }
    if (id === 'evaluate_04') await activate(page, '#btn-submit');
    return;
  }
  if (id === 'evaluate_09') {
    for (const decision of data.ds) {
      const idx = decision.o.findIndex(o => o.l === 2);
      await tabTo(page, page.locator('#d-opts input').first());
      for (let j = 0; j < idx; j++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      await activate(page, '#btn-ok');
      await activate(page, '#btn-next');
    }
    return;
  }
  if (id === 'evaluate_07') {
    const cells = new Map();
    for (const word of data.words) for (const [k, ch] of [...word.w].entries())
      cells.set(`${word.r + (word.d === 'v' ? k : 0)},${word.c + (word.d === 'h' ? k : 0)}`, ch);
    for (const [key, ch] of cells) {
      const [r, c] = key.split(',');
      await tabTo(page, page.locator(`.ev-cell[data-r="${r}"][data-c="${c}"]`));
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.insertText(ch);
    }
    await activate(page, '#btn-check');
    return;
  }
  if (['elaborate_02', 'elaborate_07'].includes(id)) {
    const selector = id === 'elaborate_02' ? '.eg-step' : '.lc-ex';
    for (let i = 0; i < data.length; i++) {
      const box = page.locator(selector).nth(i);
      await tabTo(page, box.locator('textarea'));
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.insertText(data[i].k.join(' ') + ' ' + (data[i].s || data[i].r));
      await activate(page, box.locator(id === 'elaborate_02' ? '.eg-check' : '.lc-run'));
    }
    return;
  }
  if (id === 'elaborate_06') {
    for (let ending = 0; ending < data.need; ending++) {
      if (ending) await activate(page, '#er-again');
      for (let level = 0; level < data.depth; level++)
        await activate(page, page.locator('#er-opts button').nth(level === data.depth - 1 ? ending : 0));
    }
    return;
  }
  if (id === 'evaluate_05') {
    for (const [i, item] of data.items.entries()) {
      await tabTo(page, page.locator(`#in${i}`));
      await page.keyboard.insertText(item.a);
      await activate(page, `[data-check="${i}"]`);
    }
    return;
  }
  if (id === 'evaluate_06') {
    for (let i = 0; i < data.pairs.length; i++) {
      await activate(page, `.rl-term[data-i="${i}"]`);
      await activate(page, `[data-place="${i}"]`);
    }
    return;
  }
  if (id === 'elaborate_08') {
    for (const chip of await page.locator('.mpb-chip').all()) {
      const cat = await chip.getAttribute('category');
      await activate(page, chip);
      await activate(page, `.mpb-zone[accepts="${cat}"]`);
    }
    return;
  }
  if (id === 'explain_07') {
    await all(page, '.tl-mark');
    for (const h of [...data.h].sort((a, b) => parseInt(a.anio) - parseInt(b.anio)))
      await activate(page, page.locator('#tl-pool button').filter({ hasText: h.titulo }));
    return;
  }
  // Formularios, rúbricas, entradas abiertas y sliders, con entrada de teclado.
  for (const loc of await page.locator('textarea, input[type="text"]').all()) {
    if (!await loc.isVisible()) continue;
    await tabTo(page, loc);
    await page.keyboard.insertText('Analizo el mecanismo de almacenamiento y el plan de ejecución para justificar esta decisión técnica. '.repeat(3));
  }
  for (const loc of await page.locator('input[type="range"]').all()) {
    await tabTo(page, loc);
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await page.keyboard.press('ArrowLeft');
  }
  const used = new Set();
  for (let round = 0; round < 35; round++) {
    if (await page.locator('upao-complete button').isEnabled()) return;
    await all(page, 'upao-choice[correct="true"] button');
    await all(page, 'input[type="checkbox"]:visible:not(:checked):not(:disabled)');
    const names = await page.locator('input[type="radio"]').evaluateAll(els => [...new Set(els.map(e => e.name))]);
    for (const name of names) {
      const group = page.locator(`input[type="radio"][name="${name}"]:visible:not(:disabled)`);
      const checked = group.filter({ visible: true }).and(page.locator(':checked'));
      if (await group.count() && !await checked.count()) {
        await tabTo(page, group.first()); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Space');
      }
    }
    // Botones seguros: evita reinicios, impresión, clipboard y navegación atrás.
    const candidates = await stableAll(page, 'button:visible:not(:disabled), [role="button"][tabindex="0"]:visible, [role="tab"][tabindex="0"]:visible');
    for (const loc of candidates) {
      if (!await loc.count() || !await loc.isVisible() || !await loc.isEnabled()) continue;
      const meta = await loc.evaluate(el => {
        const path = e => {
          if (!e) return '';
          if (e.id) return '#' + e.id;
          const parent = e.parentElement;
          if (!parent) return (e.getRootNode().host?.outerHTML.split('>')[0] || '') + '/' + e.tagName;
          return path(parent) + '/' + e.tagName + ':' + [...parent.children].indexOf(e);
        };
        return { html: el.outerHTML, text: el.textContent, key: el.dataset.ciControl || path(el),
          label: el.getAttribute('aria-label'), id: el.id };
      });
      if (/reinici|reintent|restablecer|repetir|imprim|copiar|anterior|atrás|reset|again|prev|minus|zout|zin/i.test(`${meta.text} ${meta.label} ${meta.id}`)) continue;
      const repeat = /next|siguiente|aplicar|si-apply|rd-plus|ova-action-btn/.test(`${meta.id} ${meta.html}`);
      if (!repeat && used.has(meta.key)) continue;
      used.add(meta.key);
      await activate(page, loc);
      if (await page.locator('upao-complete button').isEnabled()) return;
    }
    // Avanza únicamente los timers reales; sin esperas de minutos en CI.
    await page.clock.runFor(2500);
  }
  throw new Error(`No completado ${id}: ${await page.locator('#prog [role="progressbar"]').getAttribute('aria-valuenow')}`);
}
