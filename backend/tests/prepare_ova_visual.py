"""Offline fixtures: run from backend, then playwright-cli -s=visual run-code --filename=..."""

import json
from pathlib import Path

from llm.utils.ova_runtime import inject_runtime, strip_runtime

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "backend/tests/visual-output"


def prepare():
    fixture = inject_runtime(
        (ROOT / "backend/tests/fixtures/ova-visual.html").read_text(encoding="utf-8"),
        css=True,
        components=True,
    )
    (OUTPUT / "components.html").write_text(fixture, encoding="utf-8")
    browser_test = (ROOT / "backend/tests/ova-visual.browser.js").read_text(encoding="utf-8")
    (OUTPUT / "browser-test.js").write_text(
        browser_test.replace("FIXTURE_HTML", json.dumps(fixture, ensure_ascii=False)),
        encoding="utf-8",
    )
    items = []
    for folder in ("ova2", "ova4"):
        for source in sorted((ROOT / ".playwright-cli" / folder).glob("*.html")):
            original = source.read_text(encoding="utf-8")
            authored, _, _ = strip_runtime(original)
            updated = inject_runtime(authored, css=True, components=True)
            name = f"{folder}-{source.stem}"
            (OUTPUT / f"{name}-after.html").write_text(updated, encoding="utf-8")
            items.append({"name": name, "before": original, "after": updated})
    runner = """async page => {
      const items = ITEMS;
      const results = [];
      let errors = [];
      const onError = e => errors.push(e.message);
      page.on('pageerror', onError);
      for (const width of [1280, 390]) {
        await page.setViewportSize({width, height:800});
        for (const item of items) {
          for (const version of ['before', 'after']) {
            await page.goto('about:blank');
            errors = [];
            await page.setContent(item[version], {waitUntil:'load'});
            await page.emulateMedia({reducedMotion:'reduce'});
            await page.screenshot({path:`backend/tests/visual-output/${item.name}-${version}-${width}.png`, fullPage:true});
            results.push(await page.evaluate(({name,version,width}) => ({
              name,version,width,title:document.title,
              overflow:document.documentElement.scrollWidth > innerWidth,
              headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()),
              components:[...new Set([...document.querySelectorAll('*')].map(e=>e.localName).filter(n=>n.startsWith('upao-')))]
            }), {name:item.name,version,width}));
            results[results.length-1].errors = [...errors];
          }
        }
      }
      page.off('pageerror', onError);
      return {rendered:results.length, overflow:results.filter(r=>r.overflow),
        errors:results.filter(r=>r.errors.length),
        audit:results.filter(r=>r.width===1280 && r.version==='before')};
    }""".replace("ITEMS", json.dumps(items, ensure_ascii=False))
    (OUTPUT / "compare.js").write_text(runner, encoding="utf-8")
    print(f"Prepared {len(items)} resources; compare.js renders 60 screenshots")


if __name__ == "__main__":
    prepare()
