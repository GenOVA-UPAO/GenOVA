"""Planner por ATRIBUTOS: Laya responde preguntas simples sobre el tema y reglas deciden.

Pipeline:
  1. `normalize_topic`  quita el preámbulo del docente («para mis alumnos de 5to ciclo
     que ya vieron…, quiero que…») y extrae el concepto núcleo + si hay conocimientos
     previos (atributo `avanzado`).
  2. `profile_*`        perfil del tema: atributo -> fuerza 0..1. Con Laya es UNA llamada
     batch de ~11 preguntas `noul` (probabilidad calibrada con `_squash`); `keywords` es
     un perfil offline de respaldo; `hibrido` combina ambos.
  3. `select_plan`      puntuación determinista con la tabla de `planner_table`:
     prior + afinidades - penalización de requisitos incumplidos, y selección de
     `per_phase` recursos por fase con diversidad de familia de interacción, ordenados
     por exigencia cognitiva.
"""

from __future__ import annotations

import os
import re
import unicodedata

import httpx
import structlog

from ova_engine.planner_table import (
    AREA_BONUS,
    AREA_BONUS_SCALE,
    ATTRS,
    REQ_PENALTY,
    REQ_THRESHOLD,
    TABLE,
    Resource,
)

logger = structlog.get_logger(__name__)

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")

# Pregunta simple por atributo (se pregunta sobre el concepto núcleo, sin catálogo).
ATTRIBUTES: dict[str, str] = {
    "historico": "¿El tema trata de la historia o de la evolución de algo a lo largo del tiempo?",
    "compara": "¿El tema consiste en comparar o distinguir dos o más alternativas, enfoques o tipos?",
    "procedimiento": "¿El tema es un procedimiento que se ejecuta paso a paso?",
    "etico": "¿El tema tiene un componente de ética, seguridad, privacidad o cumplimiento?",
    "tuning": "¿El tema implica ajustar parámetros numéricos o dimensionar valores para optimizar?",
    "abstracto": "¿El tema es un concepto abstracto o teórico, difícil de ver a simple vista?",
    "codigo": "¿El tema se practica escribiendo código o sentencias SQL?",
    "fallo": "¿El tema involucra fallos, errores, incidentes o recuperación ante problemas?",
    "componentes": "¿El tema describe una arquitectura con varios componentes que interactúan entre sí?",
    "diagnostico": "¿El tema consiste en diagnosticar o analizar métricas, reportes o datos?",
    "clasificacion": "¿El tema reúne varias categorías o tipos que se pueden clasificar?",
    "matematico": "¿El tema involucra matemáticas, geometría, funciones, álgebra o modelos cuantitativos?",
}

# ---------------------------------------------------------------- normalización

_PREV = re.compile(r"\b(ya\s+(vieron|conocen|dominan|saben|estudiaron|manejan)|dominan|han\s+visto|que\s+conocen)\b")
_WANT = re.compile(
    r"^(?:quiero|necesito|busco|me\s+gustaria|deseo)\s+(?:que\s+)?(?:(?:les|los|las)\s+)?"
    r"(?:mostrarles|ensenarles|explicarles|trabajar|ensenar|mostrar|explicar|aprendan|conozcan|entiendan)?\s*(?:sobre\s+)?"
)


def _fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


# Secciones que el formulario de creación añade tras el tema («Objetivo: …»,
# «Nivel educativo: …»): describen el pedido, no el concepto.
# Se busca sobre el texto ya normalizado (saltos de línea → «. », espacios simples),
# así el patrón no tiene cuantificadores solapados (sin backtracking polinómico).
_SECTIONS = re.compile(r"(?:^|[.;] )(?:objetivos?(?: de aprendizaje)?|nivel(?: educativo)?|p[uú]blico) ?:", re.I)


def _strip_sections(raw: str) -> str:
    """El texto hasta la primera sección «Objetivo:»/«Nivel educativo:» (o todo)."""
    lines = ". ".join(line.strip() for line in raw.splitlines() if line.strip())
    flat = " ".join(lines.split())
    m = _SECTIONS.search(flat)
    if m is None:
        return " ".join(raw.split())
    return flat[: m.start()]


def normalize_topic(raw: str) -> tuple[str, bool]:
    """(concepto núcleo, hay conocimientos previos). Conserva tildes del original."""
    raw = (raw or "")[:4000]  # pedido del docente: tope defensivo antes de las regex
    head = _strip_sections(raw)
    text = head if head.strip(" .:;") else " ".join(raw.split())
    advanced = False
    m = re.match(r"^\s*(?:para|con)\s+(?:mis|los|las|nuestros)\s+(?:alumnos|estudiantes|chicos)\b(.*)$", text, re.I)
    if m:
        rest = m.group(1)
        head, sep, tail = rest.partition(",")
        if sep:
            advanced = bool(_PREV.search(_fold(head)))
            text = tail.strip()
            text = re.sub(
                r"^(?:quiero|necesito|busco|deseo)\s+(?:que\s+)?(?:(?:les|los)\s+)?(?:mostrarles|ensenarles|explicarles)?\s*",
                "",
                text,
                flags=re.I,
            )
            text = re.sub(r"^(?:que\s+)", "", text, flags=re.I)
        else:
            advanced = bool(_PREV.search(_fold(rest)))
    else:
        advanced = bool(_PREV.search(_fold(text)))
    return text.strip(" .:;") or raw.strip(), advanced


# ---------------------------------------------------------------- perfil

_KW: dict[str, tuple[str, ...]] = {
    "historico": (r"histori", r"evoluci", r"\bepoca", r"genealog", r"\borigen(es)?\b", r"antes y despues", r"linea de tiempo", r"cronolog"),
    "compara": (r"\bvs\b", r"versus", r"compar", r"diferenc", r"ventajas", r"contraste", r"alternativas"),
    "procedimiento": (r"paso a paso", r"procedimiento", r"habilitar", r"configur", r"migraci", r"instalaci", r"implementaci", r"pasos"),
    "etico": (r"segur", r"inyeccion", r"audit", r"privacidad", r"cumplimiento", r"\betic", r"privilegi", r"\broles?\b", r"contrasen", r"cifrad", r"encript", r"permisos", r"acceso"),
    "tuning": (r"tuning", r"\bajuste", r"optimiz", r"dimension", r"rendimiento", r"parametros?", r"memoria", r"capacidad"),
    "abstracto": (r"concepto", r"teoria", r"modelo", r"abstract", r"fundamentos", r"aislamiento", r"principios"),
    "codigo": (r"\bsql\b", r"pl/sql|plsql", r"consulta", r"sentencia", r"codigo", r"\bcomandos?\b", r"programaci", r"script"),
    "fallo": (r"fallo", r"recuper", r"backup|respaldo", r"error", r"incidente", r"bloqueo", r"deadlock", r"caida", r"perdida", r"contingencia"),
    "componentes": (r"arquitectura", r"componentes?", r"procesos?", r"estructuras?", r"almacenamiento", r"servicios?"),
    "diagnostico": (r"diagnos", r"monitor", r"analiz", r"reporte", r"metricas?", r"esperas?", r"trazas?", r"auditor[ií]a de rendimiento", r"planes?\b"),
    "clasificacion": (r"tipos? de", r"clases? de", r"categori", r"niveles", r"estrategias", r"modalidades", r"modos"),
    "matematico": (r"matemat", r"geometr", r"algebra", r"calculo", r"funcion(es)?\b", r"grafic", r"trigonometr", r"vector", r"probabilidad", r"estadistic", r"ecuaci", r"polinom", r"derivada", r"integral", r"matriz|matrices", r"parabola", r"hiperbola", r"trigonometria"),
}
_KW_RE = {k: re.compile("|".join(v)) for k, v in _KW.items()}


def profile_keywords(concept: str, advanced: bool = False) -> dict[str, float]:
    folded = _fold(concept)
    prof = {a: (1.0 if _KW_RE[a].search(folded) else 0.0) for a in ATTRS if a != "avanzado"}
    prof["avanzado"] = 1.0 if advanced else 0.0
    return prof


def _squash(p: float) -> float:
    """Probabilidad `noul` -> fuerza 0..1. Laya tiende a responder alto; se exige > 0.5."""
    return max(0.0, min(1.0, (p - _NOUL_LO) / (1.0 - _NOUL_LO)))


_NOUL_LO = float(os.getenv("OVA_PLANNER_NOUL_LO", "0.5"))


def _laya_endpoint() -> tuple[str, dict, dict]:
    """Laya local o, con `OVA_DECISION_BACKEND=jev`, Jev en OpenRouter (mismo protocolo)."""
    from ova_engine.decision import _backend, _endpoint

    if _backend() == "jev" and not os.getenv("OVA_PLANNER_URL"):
        return _endpoint()
    base = (os.getenv("OVA_PLANNER_URL") or os.getenv("OVA_DECISION_URL") or "http://localhost:8090").rstrip("/")
    headers = {"Authorization": f"Bearer {os.environ['LAYA_API_KEY']}"} if os.getenv("LAYA_API_KEY") else {}
    return f"{base}/v1/systemone", headers, {"model": "multilingual"}


def profile_laya(concept: str, advanced: bool = False, timeout: float = 6.0, url: str | None = None) -> dict[str, float] | None:
    """Una llamada batch con una pregunta `noul` por atributo. None si Laya falla."""
    endpoint, headers, extra = _laya_endpoint()
    if url:
        endpoint = f"{url.rstrip('/')}/v1/systemone"
    questions = {a: {"type": "noul", "instructions": q} for a, q in ATTRIBUTES.items()}
    state = f"Tema de enseñanza: {concept}"
    try:
        r = httpx.post(endpoint, json={"state": state, "questions": questions, **extra}, headers=headers, timeout=timeout)
        r.raise_for_status()
        answers = r.json().get("answers") or {}
    except Exception as exc:
        logger.warning("ova planner profile failed", error=str(exc)[:200])
        return None
    prof = {}
    for a in ATTRIBUTES:
        ans = answers.get(a) or {}
        p = ans.get("noul", ans.get("probability"))
        if not isinstance(p, (int, float)):
            return None
        prof[a] = _squash(float(p))
    prof["avanzado"] = 1.0 if advanced else 0.0
    return prof


_W_KW = float(os.getenv("OVA_PLANNER_KW_WEIGHT", "0.5"))


def blend(laya: dict[str, float], kw: dict[str, float], w_kw: float = _W_KW) -> dict[str, float]:
    return {a: (1 - w_kw) * laya.get(a, 0.0) + w_kw * kw.get(a, 0.0) for a in ATTRS}


# ---------------------------------------------------------------- selección


def score_resource(res: Resource, profile: dict[str, float]) -> float:
    s = res.prior + sum(w * profile.get(a, 0.0) for a, w in res.aff.items())
    for a, thr in res.req.items():
        if profile.get(a, 0.0) < thr:
            s -= REQ_PENALTY
    if res.req_any and max(profile.get(a, 0.0) for a in res.req_any) < REQ_THRESHOLD:
        s -= REQ_PENALTY
    return s


def unmet_requirements(res: Resource, profile: dict[str, float]) -> bool:
    if any(profile.get(a, 0.0) < thr for a, thr in res.req.items()):
        return True
    return bool(res.req_any) and max(profile.get(a, 0.0) for a in res.req_any) < REQ_THRESHOLD


_DIVERSITY_PENALTY = 0.25  # por cada recurso ya elegido de la misma familia
_MAX_PER_MODAL = 2


def area_bonus(area: str | None) -> dict[tuple[str, int], float]:
    """Empujón por área temática: (fase, n) -> bonus. Vacío sin área o sin coincidencia."""
    folded = _fold(area or "")
    out: dict[tuple[str, int], float] = {}
    if not folded.strip():
        return out
    for pattern, bonuses in AREA_BONUS:
        if re.search(pattern, folded):
            for key, w in bonuses.items():
                out[key] = out.get(key, 0.0) + w * AREA_BONUS_SCALE
    return out


def select_phase(
    phase: str, profile: dict[str, float], per_phase: int = 3, area: str | None = None
) -> list[int]:
    table = TABLE[phase]
    bonus = area_bonus(area)
    base = {n: score_resource(r, profile) + bonus.get((phase, n), 0.0) for n, r in table.items()}
    chosen: list[int] = []
    while len(chosen) < per_phase:
        best = None
        for n, r in table.items():
            if n in chosen:
                continue
            same = sum(1 for c in chosen if table[c].modal == r.modal)
            if same >= _MAX_PER_MODAL:
                continue
            val = base[n] - _DIVERSITY_PENALTY * same
            key = (val, -n)  # desempate determinista: menor id
            if best is None or key > best[0]:
                best = (key, n)
        if best is None:
            break
        chosen.append(best[1])
    return sorted(chosen, key=lambda n: (table[n].nivel, n))


def select_plan(
    profile: dict[str, float], per_phase: int = 3, area: str | None = None
) -> dict[str, list[int]]:
    return {p: select_phase(p, profile, per_phase, area) for p in PHASES}


def plan_by_attributes(concept: str, mode: str = "hibrido", url: str | None = None, per_phase: int = 3) -> dict | None:
    """Plan completo. mode: laya | keywords | hibrido (defecto). Si Laya falla, hibrido degrada a keywords (sin red); laya puro devuelve None."""
    core, advanced = normalize_topic(concept)
    kw = profile_keywords(core, advanced)
    if mode == "keywords":
        prof = kw
    else:
        laya = profile_laya(core, advanced, url=url)
        if laya is None:
            if mode == "laya":
                return None
            prof = kw
        else:
            prof = laya if mode == "laya" else blend(laya, kw)
    from ova_engine.domain_context import current_area

    area = current_area()
    plan = select_plan(prof, per_phase, area)
    logger.info("ova planner atributos", concept=core, area=area, profile={k: round(v, 2) for k, v in prof.items() if v}, plan=plan)
    return plan
