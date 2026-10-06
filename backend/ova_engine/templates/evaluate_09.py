"""EVALUATE 9 — Simulación Evaluativa: escenario del DBA con decisiones ponderadas y estado del sistema."""

from __future__ import annotations

from ova_engine.contract import Param, RenderContext, TemplateSpec
from ova_engine.domain_context import domain_for
from ova_engine.html import PROGRESS_JS, esc, json_data, script
from ova_engine.schema import arr, i, obj, s
from ova_engine.templates._evaluate_common import EV_CSS, NORM_JS, trim_to_param

PARAMS = (
    Param("num_decisions", 4, min=2, max=5, help="Número de decisiones del escenario"),
)

_CSS = """
<style>
.sm-pick{display:flex;gap:10px;align-items:flex-start;cursor:pointer;border:2px solid var(--border,#cbd5e1);border-radius:var(--radius,12px);padding:var(--space-2,12px) var(--space-3,16px);background:var(--surface,#fff);min-height:44px}
.sm-pick:hover{border-color:var(--primary,#0A3D91)}
.sm-pick input{width:22px;height:22px;flex:none;accent-color:var(--primary,#0A3D91);margin-top:2px}
.sm-pick:has(input:checked){border-color:var(--primary,#0A3D91);background:var(--surface-tint,#eef2ff)}
.sm-pick:has(input:focus-visible){outline:3px solid var(--primary,#0A3D91);outline-offset:2px}
.sm-meter{display:grid;gap:4px;min-width:180px;flex:1}
.sm-meter .ev-bar>span{background:var(--success,#1a7f4b)}
.sm-meter.is-low .ev-bar>span{background:var(--danger,#c0392b)}
.sm-meter.is-mid .ev-bar>span{background:var(--accent,#F47A20)}
.sm-rep{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center}
.sm-w{font-size:.8rem;color:var(--text-muted,#5b6578)}
</style>
"""


def schema(p: dict) -> dict:
    n = p["num_decisions"]
    return obj(
        titulo=s(70),
        escenario=s(360),
        decisiones=arr(
            obj(
                criterio=s(40),
                peso=i(),
                situacion=s(260),
                opciones=arr(obj(texto=s(160), nivel=i(), feedback=s(200)), 3, 3),
            ),
            min_items=n,
            max_items=n,
        ),
        veredicto_alto=s(240),
        veredicto_medio=s(240),
        veredicto_bajo=s(240),
    )


def prompt(concept: str, contexto: str, p: dict) -> str:
    d = domain_for(concept, contexto)
    rol = d.pick("Diseñador de simulaciones evaluativas para futuros DBA.", f"Diseñador de simulaciones evaluativas de {d.topic} para {d.audiencia}. {d.guia_nivel}")
    actor = d.pick("un DBA", "una persona que aplica el tema")
    extra = d.pick("Menciona sentencias o vistas de Oracle cuando aplique.", "Mantente estrictamente en el tema y el nivel indicados, con ejemplos propios del tema.")
    n = p["num_decisions"]
    return f"""[ROL] {rol}
[CONCEPTO] «{concept}» ({d.curso}).
[TAREA] Diseña un escenario realista de {actor} que debe tomar {n} decisiones encadenadas sobre «{concept}».
- titulo: título corto de la simulación.
- escenario: contexto del caso (empresa, síntoma, restricción) en ≤50 palabras.
- decisiones: exactamente {n}, en orden lógico. Cada una con:
  * `criterio`: competencia que mide (≤4 palabras, ej. «Diagnóstico», «Seguridad»); distinto en cada decisión.
  * `peso`: entero 1, 2 o 3 según su importancia en el caso.
  * `situacion`: lo que ocurre y lo que debe decidir {actor} (≤35 palabras).
  * `opciones`: exactamente 3, cada una con `texto` (acción concreta ≤20 palabras), `nivel` (entero: 2 = óptima, 1 = aceptable con costo, 0 = riesgosa; usa cada nivel una sola vez por decisión y varía el orden) y `feedback` (explica el porqué de la valoración ≤30 palabras).
- veredicto_alto / veredicto_medio / veredicto_bajo: mensaje final según el desempeño total (≥75 %, 40–74 %, <40 %), ≤35 palabras cada uno.
[RESTRICCIONES] Opciones plausibles, sin respuesta obvia. {extra}
{f"[MATERIAL DEL DOCENTE] Úsalo como fuente prioritaria:{chr(10)}{contexto}" if contexto else ""}"""


def _clamp(v, lo, hi, default):
    try:
        return max(lo, min(hi, int(v)))
    except (TypeError, ValueError):
        return default


def render(data: dict, ctx: RenderContext) -> str:
    ds = data["decisiones"]
    n = len(ds)
    payload = {
        "ds": [
            {
                "c": d["criterio"],
                "w": _clamp(d.get("peso"), 1, 3, 1),
                "s": d["situacion"],
                "o": [
                    {"t": o["texto"], "l": _clamp(o.get("nivel"), 0, 2, 0), "f": o["feedback"]}
                    for o in d["opciones"]
                ],
            }
            for d in ds
        ],
        "v": {"alto": data["veredicto_alto"], "medio": data["veredicto_medio"], "bajo": data["veredicto_bajo"]},
    }
    return f"""{EV_CSS}{_CSS}
<upao-header eyebrow="SIMULACIÓN EVALUATIVA" title="{esc(data["titulo"])}"><p>{esc(data["escenario"])}</p></upao-header>
<div class="ev-hud">
  <upao-progress id="prog" current="0" total="{n}" label="Decisiones" show-fraction></upao-progress>
  <div class="sm-meter" id="meter"><span id="meter-lbl">Estado del sistema: 50 %</span><div class="ev-bar" aria-hidden="true"><span id="meter-bar" style="width:50%"></span></div></div>
  <upao-score id="score" current="0" max="100" label="Evaluación"></upao-score>
</div>
<section class="ev-card ova-stack" id="step">
  <span class="ev-badge" id="d-count"></span>
  <span class="sm-w" id="d-crit"></span>
  <h2 class="ev-q" id="d-sit" tabindex="-1"></h2>
  <fieldset class="ev-opts" id="d-opts" style="border:0;padding:0;margin:0"><legend class="sm-w">Elige una acción</legend></fieldset>
  <div class="ev-row"><button type="button" class="ev-btn" id="btn-ok" disabled>Confirmar decisión</button><button type="button" class="ev-btn is-ghost" id="btn-next" hidden>Siguiente</button></div>
  <div class="ev-fb" id="d-fb" role="status" aria-live="polite" hidden></div>
</section>
<section class="ev-card ova-stack" id="result" aria-live="polite" hidden>
  <div class="ev-result"><p class="ev-big" id="result-big"></p><p id="result-msg"></p></div>
  <div class="sm-rep" id="report"></div>
  <p id="result-str"></p><p id="result-imp"></p>
</section>
<upao-summary title="Cierre">Tus decisiones se evaluaron con criterios ponderados.<upao-complete slot="actions" label="Finalizar simulación" locked></upao-complete></upao-summary>
{json_data(payload)}
{script(PROGRESS_JS)}
{script(NORM_JS + '''
const cfg = JSON.parse(document.getElementById('ova-data').textContent);
const $ = id => document.getElementById(id);
const score = $('score');
const ds = cfg.ds, total = ds.length;
const wAll = ds.reduce((a, d) => a + d.w, 0);
const lvls = [];
let idx = 0, sel = -1, confirmed = false;
const NAME = ['Riesgosa', 'Aceptable', 'Óptima'];

function pctDone() { return lvls.reduce((a, l, k) => a + ds[k].w * l, 0) / (2 * wAll); }
function health() { return Math.round(50 + 50 * lvls.reduce((a, l, k) => a + ds[k].w * (l - 1), 0) / wAll); }
function paintMeter() {
  const h = Math.max(0, Math.min(100, health()));
  $('meter-lbl').textContent = 'Estado del sistema: ' + h + ' %';
  $('meter-bar').style.width = h + '%';
  $('meter').className = 'sm-meter' + (h < 35 ? ' is-low' : h < 65 ? ' is-mid' : '');
}
function show() {
  const d = ds[idx];
  sel = -1; confirmed = false;
  $('d-count').textContent = 'Decisión ' + (idx + 1) + ' de ' + total;
  $('d-crit').textContent = ' Criterio: ' + d.c + ' (peso ' + d.w + ')';
  $('d-sit').textContent = d.s;
  $('d-fb').hidden = true; $('btn-next').hidden = true; $('btn-ok').hidden = false; $('btn-ok').disabled = true;
  const box = $('d-opts');
  box.querySelectorAll('label').forEach(l => l.remove());
  d.o.forEach(function (o, j) {
    const l = document.createElement('label'); l.className = 'sm-pick';
    const r = document.createElement('input'); r.type = 'radio'; r.name = 'dec'; r.value = j;
    const t = document.createElement('span'); t.textContent = o.t;
    l.append(r, t);
    r.addEventListener('change', () => { sel = j; $('btn-ok').disabled = false; });
    box.appendChild(l);
  });
}
$('btn-ok').addEventListener('click', function () {
  if (sel < 0 || confirmed) return;
  confirmed = true;
  const d = ds[idx], o = d.o[sel];
  lvls.push(o.l);
  document.querySelectorAll('#d-opts input').forEach(i => i.disabled = true);
  say($('d-fb'), NAME[o.l] + '. ' + o.f, o.l === 2 ? 'ok' : o.l === 1 ? '' : 'bad');
  score.set(Math.round(100 * pctDone() * 1));
  paintMeter();
  window.ovaMark('d' + idx);
  $('btn-ok').hidden = true;
  const nx = $('btn-next'); nx.hidden = false; nx.textContent = idx + 1 >= total ? 'Ver informe final' : 'Siguiente decisión';
  nx.focus();
});
$('btn-next').addEventListener('click', function () {
  if (idx + 1 < total) { idx++; show(); $('d-sit').focus(); return; }
  finish();
});
function finish() {
  $('step').hidden = true; $('result').hidden = false;
  const pct = Math.round(100 * pctDone());
  score.set(pct);
  $('result-big').textContent = pct + ' / 100';
  $('result-msg').textContent = pct >= 75 ? cfg.v.alto : pct >= 40 ? cfg.v.medio : cfg.v.bajo;
  const rep = $('report'); const good = [], bad = [];
  ds.forEach(function (d, k) {
    const a = document.createElement('span'); a.textContent = d.c + ' (peso ' + d.w + ')';
    const b = document.createElement('strong'); b.textContent = NAME[lvls[k]];
    rep.append(a, b);
    (lvls[k] === 2 ? good : bad).push(d.c);
  });
  $('result-str').textContent = 'Fortalezas: ' + (good.join(', ') || 'aún ninguna, sigue practicando') + '.';
  $('result-imp').textContent = 'A mejorar: ' + (bad.join(', ') || 'nada relevante') + '.';
  $('result').scrollIntoView({block: 'start'});
}
show(); paintMeter();
''')}
"""


def sample(concept: str, p: dict) -> dict:
    n = p["num_decisions"]
    base = [
        ("Diagnóstico", 3, "Los reportes de ventas tardan 40 segundos desde ayer. ¿Cuál es tu primer paso?",
         ("Revisar el plan de ejecución de la consulta lenta", 2, "Es la base de todo diagnóstico: el plan muestra dónde se pierde el tiempo."),
         ("Reiniciar la instancia para limpiar memoria", 0, "Reiniciar interrumpe a todos y no identifica la causa."),
         ("Crear índices en todas las columnas filtradas", 1, "Puede ayudar, pero sin evidencia añade costo en escrituras.")),
        ("Diseño", 2, "El plan muestra TABLE ACCESS FULL sobre una tabla de 20 millones de filas filtrada por cliente. ¿Qué haces?",
         ("Crear un índice B-tree sobre la columna de cliente", 2, "Un B-tree reduce las lecturas cuando el filtro es selectivo."),
         ("Subir el tamaño de la SGA al máximo", 1, "Ayuda al caché pero no elimina el full scan."),
         ("Particionar la tabla por mes sin analizar el patrón", 0, "Sin evidencia del patrón de acceso puede no mejorar nada.")),
        ("Riesgo", 2, "Crear el índice en producción en horario laboral podría bloquear a los usuarios. ¿Cómo procedes?",
         ("Usar CREATE INDEX ... ONLINE en una ventana de baja carga", 2, "ONLINE minimiza el bloqueo y la ventana reduce el impacto."),
         ("Crearlo directamente a mediodía", 0, "Puede bloquear DML y afectar a todos los usuarios."),
         ("Posponerlo una semana sin medir nada", 1, "Evita el riesgo, pero mantiene el problema sin mitigarlo.")),
        ("Verificación", 3, "El índice ya existe. ¿Cómo confirmas que funcionó?",
         ("Comparar el plan y las lecturas lógicas antes y después", 2, "Medir con la misma consulta demuestra el efecto real."),
         ("Preguntar a los usuarios si sienten mejora", 1, "Útil como señal, pero es subjetivo."),
         ("Asumir que funcionó porque el índice está VALID", 0, "VALID no garantiza que el optimizador lo use.")),
        ("Mantenimiento", 1, "Una semana después las estadísticas cambiaron mucho por una carga masiva. ¿Qué haces?",
         ("Recolectar estadísticas con DBMS_STATS", 2, "Estadísticas frescas permiten decisiones correctas del optimizador."),
         ("Reconstruir todos los índices cada noche", 0, "Costoso e innecesario sin evidencia de fragmentación."),
         ("No hacer nada", 1, "Puede funcionar un tiempo, pero degrada los planes.")),
    ]
    ds = []
    for k in range(n):
        crit, w, sit, a, b_, c = base[k]
        opts = [a, b_, c]
        rot = k % 3
        opts = opts[rot:] + opts[:rot]
        ds.append(
            {
                "criterio": crit,
                "peso": w,
                "situacion": sit,
                "opciones": [{"texto": t, "nivel": lv, "feedback": f} for t, lv, f in opts],
            }
        )
    return {
        "titulo": f"Simulación: {concept}"[:70],
        "escenario": f"Eres DBA de una empresa de retail y debes resolver un problema de rendimiento relacionado con {concept}.",
        "decisiones": ds,
        "veredicto_alto": "Decisiones sólidas: priorizas diagnóstico y bajo riesgo.",
        "veredicto_medio": "Buen criterio general, pero algunas decisiones asumen riesgos innecesarios.",
        "veredicto_bajo": "Repasa el diagnóstico basado en evidencia antes de actuar en producción.",
    }


SPEC = TemplateSpec(
    phase="evaluate",
    rt=9,
    title="Simulación Evaluativa",
    params=PARAMS,
    schema=schema,
    prompt=prompt,
    render=render,
    sample=sample,
    normalize=trim_to_param("decisiones", "num_decisions"),
)
