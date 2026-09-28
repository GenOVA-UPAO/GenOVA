async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  await page.goto('about:blank');
  await page.setContent(FIXTURE_HTML, {waitUntil:'load'});
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({width, height:800});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Gallery overflow at ${width}px`);
    await page.screenshot({path:`backend/tests/visual-output/components-${width}.png`, fullPage:true});
  }
  const content = await page.evaluate(() => {
    const header = document.querySelector('upao-header');
    header.setAttribute('title', '<img src=x onerror=alert(1)>');
    const safe = !header.shadowRoot.querySelector('img') && header.shadowRoot.querySelector('h1').textContent.includes('<img');
    header.setAttribute('title', 'Calcula la corriente con la ley de Ohm');
    const title = header.shadowRoot.querySelector('h1');
    header.style.setProperty('--primary', 'rgb(12, 34, 56)');
    const inherited = getComputedStyle(title).color === 'rgb(12, 34, 56)';
    header.style.removeProperty('--primary');
    const status = document.querySelector('upao-status');
    status.setAttribute('state', '__proto__');
    const fallback = status.shadowRoot.querySelector('.sr').textContent === 'Información: ';
    status.hidden = true;
    const hidden = getComputedStyle(status).display === 'none';
    status.hidden = false;
    const css = document.getElementById('ova-base').sheet;
    return {safe,inherited,fallback,hidden,rules:css.cssRules.length,
      semantic:!!document.querySelector('upao-question').shadowRoot.querySelector('fieldset>legend'),
      steps:document.querySelectorAll('upao-steps>ol>li').length,
      summary:document.querySelector('upao-summary').shadowRoot.querySelector('slot[name=actions]').assignedElements().length};
  });
  for (const key of ['safe','inherited','fallback','hidden','semantic']) assert(content[key], key);
  assert(content.rules > 50 && content.steps === 3 && content.summary === 2, 'CSS and slot structure');
  const table = page.getByRole('region', {name:'Mediciones de resistencia y corriente'});
  await table.focus();
  assert(await table.evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'Table keyboard focus');
  await table.locator('table').evaluate(el => { el.style.minWidth = '800px'; });
  assert(await table.evaluate(el => el.scrollWidth > el.clientWidth && document.documentElement.scrollWidth <= innerWidth), 'Wide table scroll stays local');
  await page.keyboard.press('End');
  await table.locator('table').evaluate(el => { el.style.minWidth = ''; });
  await page.getByText('Ver cálculo en código', {exact:true}).focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('details').evaluate(el => el.open), 'Native disclosure keyboard');
  const answer = page.locator('upao-choice').first().getByRole('button');
  await answer.focus();
  assert(await answer.evaluate(el => getComputedStyle(el).outlineStyle === 'solid'), 'Choice keyboard focus');
  await page.keyboard.press('Space');
  assert(await page.locator('upao-choice button:disabled').count() === 2, 'Only one attempt in a question');
  assert(await page.locator('upao-status').getAttribute('state') === 'success', 'Live status updated');
  assert(await page.locator('upao-score .val').textContent() === '1', 'Score updated once');
  assert(await answer.evaluate(el => getComputedStyle(el).animationName === 'none'), 'Shadow DOM reduced motion');
  await page.evaluate(() => {
    const other = document.createElement('upao-question');
    other.innerHTML = '<upao-choice group="q1" value="B">Otra pregunta</upao-choice>';
    document.querySelector('main').append(other);
  });
  assert(await page.getByRole('button', {name:'B Otra pregunta'}).isEnabled(), 'Independent question group');
  await page.getByRole('button', {name:'Finalizar práctica'}).focus();
  await page.keyboard.press('Enter');
  assert(await page.getByText('¡Completado!', {exact:true}).count() === 1, 'Completion works without LMS');
  await page.screenshot({path:'backend/tests/visual-output/components-answered-320.png', fullPage:true});
  page.off('pageerror', onError);
  assert(errors.length === 0, errors.join('\n'));
  return {passed:true, checks:'mobile overflow, slots, text escaping, token inheritance, invalid state, hidden, CSS, keyboard, feedback, group locking, score, reduced motion, standalone completion'};
}
