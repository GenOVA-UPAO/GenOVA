"""Ejecuta el JS exportado: reanudación local, fallos de storage y estado SCORM."""

import json
import re
import shutil
import subprocess
from io import BytesIO
from zipfile import ZipFile

import pytest

from scorm import build_export

PHASES = [
    {"type": "engage", "order": 1, "content": "Inicio"},
    {"type": "evaluate", "order": 2, "content": "Evaluación"},
]


def _package(format_id, phases=PHASES, title="Curso"):
    return ZipFile(BytesIO(build_export(format_id, title, phases)))


_HARNESS = r"""
const vm = require('node:vm')
const memory = Object.assign({}, CONFIG.storage || {})
const results = []
for (const session of CONFIG.sessions) {
  const listeners = {}, calls = [], values = {}
  const status = { textContent: '' }, button = { addEventListener: (k, fn) => { button[k] = fn } }
  const frame = {
    src: '', contentWindow: {},
    getAttribute: k => k === 'src' ? frame.src : null,
    setAttribute: () => {},
  }
  const tabs = ['resources/recurso_1.html', 'resources/recurso_2.html'].map(src => ({
    textContent: src, attrs: { 'data-src': src },
    getAttribute(k) { return this.attrs[k] },
    setAttribute(k, v) { this.attrs[k] = v },
    addEventListener(k, fn) { this[k] = fn },
    focus() {},
  }))
  const document = {
    body: { getAttribute: k => k === 'data-package-format' ? CONFIG.format : CONFIG.key },
    getElementById: id => ({ 'scorm-status': status, 'complete-btn': button, 'res-frame': frame })[id],
    querySelectorAll: () => tabs,
  }
  const window = {
    addEventListener: (k, fn) => { listeners[k] = fn },
    localStorage: {
      getItem(k) { if (session.blockRead) throw Error('bloqueado'); return memory[k] || null },
      setItem(k, v) { if (session.blockWrite) throw Error('cuota'); memory[k] = v },
    },
    GenovaXapi: {
      experienced: () => calls.push(['xapi-experienced']),
      completed: () => calls.push(['xapi-completed']),
      terminated: () => calls.push(['xapi-terminated']),
    },
  }
  window.parent = window
  if (session.api) {
    const api = {
      initialize: () => { calls.push(['initialize']); return 'true' },
      get: k => values[k] || 'not attempted',
      set: (k, v) => { calls.push(['set', k, v]); values[k] = v; return 'true' },
      commit: () => { calls.push(['commit']); return 'true' },
      finish: () => { calls.push(['finish']); return 'true' },
    }
    if (CONFIG.format === 'scorm2004') {
      window.API_1484_11 = { Initialize: api.initialize, GetValue: api.get,
        SetValue: api.set, Commit: api.commit, Terminate: api.finish }
    } else {
      window.API = { LMSInitialize: api.initialize, LMSGetValue: api.get,
        LMSSetValue: api.set, LMSCommit: api.commit, LMSFinish: api.finish }
    }
  }
  const context = vm.createContext({ window, document })
  vm.runInContext(CONFIG.scorm, context)
  vm.runInContext(CONFIG.app, context)
  listeners.DOMContentLoaded()
  const statuses = [status.textContent]
  for (const action of session.actions || []) {
    if (action.type === 'select') tabs[action.index].click()
    if (action.type === 'resource') listeners.message({
      source: action.foreign ? {} : frame.contentWindow,
      data: { type: 'genova-resource-completed', score: action.score },
    })
    if (action.type === 'complete') button.click()
    if (action.type === 'unload') listeners.beforeunload()
    statuses.push(status.textContent)
  }
  results.push({ statuses, src: frame.src, calls, storage: { ...memory } })
}
console.log(JSON.stringify(results))
"""


def _run(format_id, sessions, storage=None):
    if not shutil.which("node"):
        pytest.skip("node no disponible")
    z = _package(format_id)
    index = z.read("index.html").decode()
    config = {
        "format": format_id,
        "key": re.search(r'data-progress-key="([^"]+)"', index)[1],
        "scorm": z.read("resources/scorm.js").decode(),
        "app": z.read("resources/app.js").decode(),
        "sessions": sessions,
        "storage": storage or {},
    }
    out = subprocess.run(  # noqa: S603 — argv fijo, JS del paquete generado aquí
        [shutil.which("node"), "-e", "const CONFIG = " + json.dumps(config) + _HARNESS],
        capture_output=True, text=True, check=True, timeout=30,
    )
    return json.loads(out.stdout)


@pytest.mark.parametrize("format_id", ["html", "ims", "scorm12", "scorm2004"])
def test_shell_declares_format_and_accessible_initial_status(format_id):
    index = _package(format_id).read("index.html").decode()
    assert f'data-package-format="{format_id}"' in index
    assert 'role="status" aria-live="polite"' in index
    if format_id in ("html", "ims"):
        assert "0 de 2 recursos completados" in index
        assert "LMS" not in index and "aula virtual" not in index
        assert "localStorage" in _package(format_id).read("resources/app.js").decode()
    else:
        assert "Vista sin aula virtual: tu progreso no se enviará" in index


@pytest.mark.parametrize("format_id", ["html", "ims"])
def test_local_progress_resumes_without_counting_visits_or_calling_lms(format_id):
    first, resumed, completed = _run(format_id, [
        {"api": True, "actions": [
            {"type": "resource", "foreign": True, "score": 100},
            {"type": "resource"},
            {"type": "resource"},  # completar dos veces no duplica el contador
            {"type": "select", "index": 1},
        ]},
        {"actions": [{"type": "complete"}, {"type": "unload"}]},
        {},
    ])
    assert first["statuses"] == [
        "Progreso local: 0 de 2 recursos completados.",
        "Progreso local: 0 de 2 recursos completados.",
        *["Progreso local: 1 de 2 recursos completados."] * 3,
    ]
    assert resumed["src"] == completed["src"] == "resources/recurso_2.html"
    assert resumed["statuses"][0] == "Progreso local: 1 de 2 recursos completados."
    assert completed["statuses"] == ["Progreso local: 2 de 2 recursos completados."]
    assert first["calls"] == resumed["calls"] == completed["calls"] == []
    assert "LMS" not in " ".join(first["statuses"] + resumed["statuses"])


@pytest.mark.parametrize("format_id", ["html", "ims"])
@pytest.mark.parametrize("failure", [{"blockRead": True, "blockWrite": True}, {"blockWrite": True}])
def test_local_storage_denied_or_full_keeps_navigation_and_completion(format_id, failure):
    result = _run(format_id, [{**failure, "actions": [
        {"type": "select", "index": 1}, {"type": "complete"},
    ]}])[0]
    assert result["src"] == "resources/recurso_2.html"
    assert result["statuses"][-1] == "Progreso de esta sesión: 2 de 2 recursos completados."
    assert result["storage"] == {}


@pytest.mark.parametrize("saved", ["no-json", "null", '{"completed":["extra.html"],"lastResource":"extra.html"}'])
def test_corrupt_or_obsolete_local_progress_is_ignored(saved):
    index = _package("html").read("index.html").decode()
    key = re.search(r'data-progress-key="([^"]+)"', index)[1]
    result = _run("html", [{}], {"genova-progress-v1:" + key: saved})[0]
    assert result["statuses"] == ["Progreso local: 0 de 2 recursos completados."]
    assert result["src"] == "resources/recurso_1.html"


def test_local_progress_key_is_stable_and_isolates_formats_titles_and_revisions():
    def key(format_id="html", phases=PHASES, title="Curso"):
        index = _package(format_id, phases, title).read("index.html").decode()
        return re.search(r'data-progress-key="([^"]+)"', index)[1]

    original = key()
    assert key() == original
    assert key("ims") != original
    assert key(title="Otro curso") != original
    assert key(phases=[{**PHASES[0], "content": "Revisado"}, PHASES[1]]) != original


@pytest.mark.parametrize("format_id", ["scorm12", "scorm2004"])
def test_scorm_without_api_uses_neutral_message_and_no_local_storage(format_id):
    result = _run(format_id, [{"actions": [{"type": "complete"}]}])[0]
    assert result["statuses"] == [
        "Vista sin aula virtual: tu progreso no se enviará",
        "OVA completado. Vista sin aula virtual: tu progreso no se enviará",
    ]
    assert result["storage"] == {}


@pytest.mark.parametrize("format_id", ["scorm12", "scorm2004"])
def test_scorm_manual_completion_does_not_invent_grade(format_id):
    result = _run(format_id, [{"api": True, "actions": [
        {"type": "complete"}, {"type": "unload"},
    ]}])[0]
    assert result["statuses"][:2] == ["Progreso: en curso.", "Estado LMS: completado y guardado."]
    sets = {c[1]: c[2] for c in result["calls"] if c[0] == "set"}
    completion_key = "cmi.core.lesson_status" if format_id == "scorm12" else "cmi.completion_status"
    assert sets[completion_key] == "completed"
    assert not any("score" in k for k in sets)
    assert ["commit"] in result["calls"] and ["finish"] in result["calls"]
    assert result["storage"] == {}


@pytest.mark.parametrize("format_id", ["scorm12", "scorm2004"])
def test_scorm_keeps_real_resource_scores(format_id):
    result = _run(format_id, [{"api": True, "actions": [
        {"type": "resource", "score": 60},
        {"type": "select", "index": 1},
        {"type": "resource", "score": 80},
    ]}])[0]
    assert result["statuses"][-1] == "Estado LMS: completado y guardado."
    sets = {c[1]: c[2] for c in result["calls"] if c[0] == "set"}
    score_key = "cmi.core.score.raw" if format_id == "scorm12" else "cmi.score.raw"
    assert sets[score_key] == "70"


def test_status_uses_theme_text_color_with_aa_default_contrast():
    css = _package("html").read("resources/styles.css").decode()
    assert "#scorm-status {\n  color: var(--text);" in css
    colors = dict(re.findall(r"--(text|surface):\s*(#[0-9a-f]{6})", css))

    def luminance(hex_color):
        rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
        return sum(v * weight for v, weight in zip(linear, (0.2126, 0.7152, 0.0722), strict=True))

    low, high = sorted(luminance(v) for v in colors.values())
    assert (high + 0.05) / (low + 0.05) >= 4.5
