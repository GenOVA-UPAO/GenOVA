"""Páginas HTML servidas dentro del LMS (iframe): error, selector de Deep Linking,
envío automático de la respuesta al LMS y reproductor de la OVA.

Son páginas del backend y no del SPA: la sesión LTI viaja en la URL y no depende
de la cookie de GenOVA (que el iframe del LMS no tiene). Estilo con los tokens de
marca UPAO (azul #0A3D91, fondo papel, tinta navy), sin dependencias externas.
"""

from __future__ import annotations

import json
from html import escape

from lti.infrastructure.ova_content import OvaSummary

_STYLE = """
:root {
  --primary: #0a3d91; --primary-foreground: #ffffff; --background: #faf8f4;
  --foreground: #14213d; --muted-foreground: #4b5563; --border: #d9d4c7;
  --card: #ffffff; --destructive: #b42318; --radius: 12px;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--background); color: var(--foreground); }
main { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 24px; line-height: 1.25; margin: 0 0 8px; text-wrap: balance; }
p { margin: 0 0 16px; max-width: 68ch; text-wrap: pretty; }
.muted { color: var(--muted-foreground); font-size: 14px; }
.error { border-left: 4px solid var(--destructive); padding-left: 12px; }
ul.ovas { list-style: none; padding: 0; margin: 16px 0; display: grid; gap: 8px; }
ul.ovas label { display: flex; gap: 12px; align-items: flex-start; min-height: 44px;
  padding: 12px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--card); cursor: pointer; }
ul.ovas input { margin-top: 4px; width: 18px; height: 18px; flex: none; }
ul.ovas .title { font-weight: 600; overflow-wrap: anywhere; }
ul.ovas .desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; }
button { min-height: 44px; padding: 0 20px; border: 0; border-radius: var(--radius);
  background: var(--primary); color: var(--primary-foreground); font: inherit;
  font-weight: 600; cursor: pointer; }
button:focus-visible, ul.ovas label:focus-within { outline: 2px solid var(--primary);
  outline-offset: 2px; }
button[disabled] { opacity: .6; cursor: progress; }
"""


def _document(title: str, body: str, *, extra_head: str = "") -> str:
    return f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>{escape(title)} · GenOVA</title>
    <style>{_STYLE}</style>
    {extra_head}
  </head>
  <body>
{body}
  </body>
</html>
"""


def _js(value: object) -> str:
    """Literal JS seguro dentro de <script> (sin `</script>` ni `<!--`)."""
    return json.dumps(value).replace("<", "\\u003c").replace(">", "\\u003e")


def error_page(message: str) -> str:
    return _document(
        "No se pudo abrir la actividad",
        f"""    <main>
      <h1>No se pudo abrir la actividad de GenOVA</h1>
      <p class="error" role="alert">{escape(message)}</p>
      <p class="muted">Si el problema continúa, avisa al docente o al administrador del LMS.</p>
    </main>""",
    )


def deep_link_page(*, ovas: list[OvaSummary], has_account: bool, post_url: str) -> str:
    if not has_account:
        body = """      <h1>Elegir una OVA de GenOVA</h1>
      <p class="error" role="alert">Tu correo del LMS no coincide con ninguna cuenta de GenOVA.</p>
      <p class="muted">Inicia sesión en GenOVA con el mismo correo que usas en el LMS
        (o pide al administrador que lo vincule) y vuelve a intentarlo.</p>"""
    elif not ovas:
        body = """      <h1>Elegir una OVA de GenOVA</h1>
      <p>Todavía no tienes OVAs listas. Crea una en GenOVA y vuelve aquí para añadirla al curso.</p>"""
    else:
        items = "\n".join(
            f"""        <li><label>
          <input type="radio" name="ova_id" value="{escape(o.id, quote=True)}" required />
          <span><span class="title">{escape(o.title)}</span>
          {"<br /><span class='muted'>Con evaluación: la nota irá al libro de calificaciones.</span>" if o.has_evaluation else ""}
          {f"<br /><span class='muted desc'>{escape(o.description)}</span>" if o.description else ""}</span>
        </label></li>"""
            for o in ovas
        )
        body = f"""      <h1>Elegir una OVA de GenOVA</h1>
      <p>Elige la OVA que verán tus estudiantes dentro del curso.</p>
      <form method="post" action="{escape(post_url, quote=True)}"
            onsubmit="this.querySelector('button').disabled = true; this.querySelector('button').textContent = 'Enviando…'">
        <fieldset style="border:0;padding:0;margin:0">
          <legend class="muted">Tus OVAs listas ({len(ovas)})</legend>
          <ul class="ovas">
{items}
          </ul>
        </fieldset>
        <button type="submit">Añadir al curso</button>
      </form>"""
    return _document("Elegir una OVA", f"    <main>\n{body}\n    </main>")


def deep_link_autopost(*, return_url: str, token: str) -> str:
    """Formulario que el navegador envía solo al LMS con el JWT firmado."""
    return _document(
        "Volviendo al LMS",
        f"""    <main>
      <h1>Volviendo al LMS…</h1>
      <form id="dl" method="post" action="{escape(return_url, quote=True)}">
        <input type="hidden" name="JWT" value="{escape(token, quote=True)}" />
        <noscript><button type="submit">Continuar</button></noscript>
      </form>
      <script>document.getElementById('dl').submit()</script>
    </main>""",
    )


_PLAYER_SCRIPT = """
(function () {
  var SCORE_URL = __SCORE_URL__
  var statusNode = document.getElementById('lti-status')
  var values = { 'cmi.core.lesson_status': 'not attempted', 'cmi.core.score.raw': '' }
  var lastSent = null
  var sending = false

  function say(text) { statusNode.textContent = text }

  function maybeSend() {
    var status = values['cmi.core.lesson_status']
    var raw = Number(values['cmi.core.score.raw'])
    if (['completed', 'passed', 'failed'].indexOf(status) < 0 || values['cmi.core.score.raw'] === '' || !isFinite(raw)) return
    if (raw === lastSent || sending) return
    sending = true
    fetch(SCORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: raw }),
      keepalive: true,
    }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b } }) })
      .then(function (res) {
        if (res.ok && res.body.sent) { lastSent = raw; say('Nota enviada al LMS: ' + res.body.score + '/100.') }
        else if (res.ok) { lastSent = raw; say('Actividad completada.') }
        else { say(res.body.detail || 'No se pudo enviar la nota al LMS.') }
      })
      .catch(function () { say('No se pudo enviar la nota al LMS. Revisa tu conexión.') })
      .then(function () { sending = false })
  }

  // API SCORM 1.2 mínima: el runtime de la OVA (scorm.js) la encuentra en la
  // ventana padre y le habla como a un LMS; aquí se traduce a AGS.
  window.API = {
    LMSInitialize: function () { return 'true' },
    LMSFinish: function () { maybeSend(); return 'true' },
    LMSGetValue: function (k) { return values[k] == null ? '' : String(values[k]) },
    LMSSetValue: function (k, v) { values[k] = String(v); return 'true' },
    LMSCommit: function () { maybeSend(); return 'true' },
    LMSGetLastError: function () { return '0' },
    LMSGetErrorString: function () { return '' },
    LMSGetDiagnostic: function () { return '' },
  }
})()
"""


def player_page(*, title: str, content_url: str, score_url: str, has_evaluation: bool) -> str:
    hint = (
        "Completa las actividades: tu nota se enviará al LMS."
        if has_evaluation
        else "Recorre el contenido a tu ritmo."
    )
    script = _PLAYER_SCRIPT.replace("__SCORE_URL__", _js(score_url))
    return _document(
        title,
        f"""    <div style="display:flex;flex-direction:column;height:100vh">
      <header style="display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--card)">
        <h1 style="font-size:16px;margin:0;min-width:0;overflow-wrap:anywhere">{escape(title)}</h1>
        <p id="lti-status" class="muted" role="status" aria-live="polite" style="margin:0">{escape(hint)}</p>
      </header>
      <iframe src="{escape(content_url, quote=True)}" title="Contenido de la OVA"
              style="flex:1;width:100%;border:0" allow="fullscreen; autoplay"></iframe>
    </div>""",
        extra_head=f"<script>{script}</script>",
    )
