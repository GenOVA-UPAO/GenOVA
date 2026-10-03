"""Revisor automático de contenido (entre `generate_json` y el render).

Con modelos pequeños el texto a veces mezcla temas o afirma algo incorrecto. Un
segundo pase barato (temperatura 0, salida estructurada) lista problemas por
ruta de campo; si los hay se reescriben SOLO esos campos (máx. 1 ronda) y se
revalida contra el schema. Nunca bloquea: ante cualquier fallo devuelve el
dato original.

Variables: `OVA_CONTENT_REVIEW` (1 por defecto), `OVA_CONTENT_REVIEW_BUDGET_S`
(tope de tiempo extra, 90 s), `OVA_CONTENT_REVIEW_PREFILTER` (0; Laya noul
«¿trata de <concepto>?» por campo largo), `OVA_CONTENT_REVIEW_MODEL` (modelo Ollama del revisor).
"""

from __future__ import annotations

import copy
import json
import os
import re
import time
from dataclasses import dataclass, field

import httpx
import structlog

from ova_engine.schema import arr, b, obj, s, validate
from ova_engine.text import generate_json

logger = structlog.get_logger(__name__)

TIPOS = ("fuera_de_tema", "incorrecto", "incoherente", "vacio")
# Campos que no son texto para el estudiante (se ignoran en la revisión).
_SKIP_KEYS = {"feedback_incorrecto", "distractores", "prompt_imagen", "prompt_video", "image_placeholder", "icono", "emoji", "color", "id", "clave"}
_MIN_LEN = 40  # textos más cortos (títulos, etiquetas, nombres) no se revisan: no tienen contenido que verificar
MAX_VERIFY = 4  # sospechas que se verifican por recurso (acota el coste)
LONG_FIELD = 80  # umbral de «campo largo» para el pre-filtro

REVIEW_SCHEMA = obj(
    revision=arr(obj(n={"type": "integer"}, veredicto={"type": "string", "enum": ["ok", *TIPOS]}))
)

_PROMPT = """[ROL] Eres un revisor técnico estricto de material didáctico universitario de Bases de Datos.
[CONCEPTO] «{concept}»
[TAREA] Para CADA campo de la lista (por su número entre corchetes), en orden, da un veredicto:
- ok: el texto trata sobre «{concept}» (o es un detalle, paso o ejemplo razonable de él) y es correcto.
- fuera_de_tema: el texto trata de OTRO tema de bases de datos distinto a «{concept}» (otro componente, otra técnica).
- incorrecto: contiene una afirmación técnicamente falsa o engañosa sobre «{concept}».
- incoherente: se contradice con el resto o no tiene sentido.
- vacio: no dice nada útil (relleno, repetición).
[RESTRICCIONES]
- Lee el contenido de cada campo con atención: mezclar un párrafo de otro tema dentro de un recurso es el error más frecuente.
- No marques estilo, tono, humor, metáforas ni analogías razonables.
- Las opciones de preguntas de opción múltiple pueden contener respuestas incorrectas A PROPÓSITO (distractores): no son error.
- Las «descripcion_visual» y «prompt» son instrucciones para ilustrar: no las marques como vacías.
- Ante la duda en detalles menores, «ok»; pero un tema distinto o un dato falso evidente NO es «ok».
- Responde solo con el número del campo y el veredicto.
[CAMPOS]
{fields}
"""


@dataclass
class ReviewReport:
    enabled: bool = True
    fields: int = 0
    found: list[dict] = field(default_factory=list)
    fixed: int = 0
    review_s: float = 0.0
    fix_s: float = 0.0
    prefiltered: int = 0
    error: str = ""

    def summary(self) -> dict | None:
        if not self.enabled:
            return None
        return {"found": len(self.found), "fixed": self.fixed, "extra_s": round(self.extra_s, 1)}

    @property
    def extra_s(self) -> float:
        return self.review_s + self.fix_s


def enabled() -> bool:
    return os.getenv("OVA_CONTENT_REVIEW", "1").strip().lower() not in ("0", "false", "no", "off", "")


# ---------------------------------------------------------------- rutas


def iter_text_fields(data, path: str = "") -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k in _SKIP_KEYS:
                continue
            out += iter_text_fields(v, f"{path}.{k}" if path else k)
    elif isinstance(data, list):
        for n, v in enumerate(data):
            out += iter_text_fields(v, f"{path}[{n}]")
    elif isinstance(data, str) and len(data.strip()) >= _MIN_LEN and not _OPTION_TEXT.search(path):
        out.append((path, data))
    return out


# Texto de las opciones de pregunta: incluye distractores incorrectos A PROPÓSITO.
_OPTION_TEXT = re.compile(r"opciones\[\d+\]\.texto$")
_TOKEN = re.compile(r"([^.\[\]]+)|\[(\d+)\]")


def _tokens(path: str) -> list[str | int]:
    return [int(m.group(2)) if m.group(2) is not None else m.group(1) for m in _TOKEN.finditer(path)]


def get_path(data, path: str):
    cur = data
    for t in _tokens(path):
        cur = cur[t]
    return cur


def set_path(data, path: str, value) -> None:
    toks = _tokens(path)
    cur = data
    for t in toks[:-1]:
        cur = cur[t]
    cur[toks[-1]] = value


# ---------------------------------------------------------------- pre-filtro Laya


def _prefilter(concept: str, fields: list[tuple[str, str]]) -> set[str]:
    """Rutas de campos largos que Laya considera claramente DENTRO del tema (se omiten
    en la revisión). Solo se descarta con noul ≥ umbral; ante cualquier fallo no omite nada."""
    if os.getenv("OVA_CONTENT_REVIEW_PREFILTER", "0") != "1":
        return set()
    long_ = [(p, t) for p, t in fields if len(t) >= LONG_FIELD]
    if not long_:
        return set()
    base = os.getenv("OVA_DECISION_URL", "http://localhost:8090").rstrip("/")
    thr = float(os.getenv("OVA_CONTENT_REVIEW_PREFILTER_MIN", "0.9"))
    questions = {
        f"q{n}": {
            "type": "noul",
            "instructions": f"Is this text about «{concept}» (a database topic), without drifting to another topic?",
            "criteria": {"true": f"The text is about {concept}", "false": "The text is about a different topic"},
        }
        for n in range(len(long_))
    }
    try:
        # una pregunta por texto: el estado es el texto del campo
        ok: set[str] = set()
        for n, (p, t) in enumerate(long_):
            r = httpx.post(
                f"{base}/v1/systemone",
                json={"model": "multilingual", "state": f"Text: {t}", "questions": {"q": questions[f"q{n}"]}},
                timeout=4.0,
            )
            r.raise_for_status()
            ans = (r.json().get("answers") or {}).get("q") or {}
            if float(ans.get("noul", 0)) >= thr:
                ok.add(p)
        return ok
    except Exception as exc:
        logger.warning("content review prefilter failed", error=str(exc)[:150])
        return set()


# ---------------------------------------------------------------- revisión


def _llm_json(prompt: str, schema: dict, *, deadline: float | None, llm_config, enabled_models) -> dict:
    return generate_json(
        prompt,
        schema,
        llm_config=llm_config,
        enabled_models=enabled_models,
        deadline=deadline,
        max_tokens=1500,
        timeout=float(os.getenv("OVA_CONTENT_REVIEW_TIMEOUT_S", "60")),
        temperature=0.0,
        attempts=1,
        model=os.getenv("OVA_CONTENT_REVIEW_MODEL") or None,  # modelo local más fuerte solo para revisar
    )


def review_fields(
    concept: str,
    fields: list[tuple[str, str]],
    *,
    deadline: float | None = None,
    llm_config=None,
    enabled_models=None,
) -> list[dict]:
    """Problemas por ruta de campo (solo rutas existentes y tipos válidos)."""
    if not fields:
        return []
    listing = "\n".join(f"[{n}] ({p}) {t}" for n, (p, t) in enumerate(fields))
    out = _llm_json(
        _PROMPT.format(concept=concept, fields=listing),
        REVIEW_SCHEMA,
        deadline=deadline,
        llm_config=llm_config,
        enabled_models=enabled_models,
    )
    texts = dict(fields)
    seen: set[str] = set()
    problems = []
    for pr in out.get("revision", []):
        n = pr["n"]
        if pr["veredicto"] == "ok" or not 0 <= n < len(fields) or fields[n][0] in seen:
            continue
        seen.add(fields[n][0])
        problems.append({"campo": fields[n][0], "tipo": pr["veredicto"], "explicacion": "revisión automática"})
    if verify_on():
        kept = []
        for p in problems[:MAX_VERIFY]:
            if deadline is not None and time.monotonic() >= deadline:
                break  # sin tiempo para la segunda opinión: se descarta la sospecha
            motivo = _verify(
                concept, p, texts[p["campo"]], deadline=deadline, llm_config=llm_config, enabled_models=enabled_models
            )
            if motivo is not None:
                kept.append({**p, "explicacion": motivo or p["explicacion"]})
        problems = kept
    return problems


def verify_on() -> bool:
    return os.getenv("OVA_CONTENT_REVIEW_VERIFY", "1") != "0"


def _verify(concept: str, problem: dict, text: str, *, deadline, llm_config, enabled_models) -> str | None:
    """Segunda opinión por campo señalado (solo se paga cuando hay sospecha): recorta falsos positivos."""
    try:
        out = _llm_json(
            _VERIFY_PROMPT.format(
                concept=concept,
                campo=problem["campo"],
                texto=text,
                pregunta=_PREGUNTA[problem["tipo"]].format(concept=concept),
            ),
            _VERIFY_SCHEMA,
            deadline=deadline,
            llm_config=llm_config,
            enabled_models=enabled_models,
        )
        return None if out.get("respuesta_si") else out.get("motivo", "")
    except Exception:
        return ""  # sin verificación, se conserva la sospecha


_VERIFY_PROMPT = """[ROL] Eres un profesor de Bases de Datos que evalúa un fragmento de un recurso didáctico.
[CONCEPTO DEL RECURSO] «{concept}»
[TEXTO DEL CAMPO «{campo}»]
{texto}
[PREGUNTA] {pregunta}
Razona en «motivo» (una frase) y responde «respuesta_si» con true o false.
"""
_VERIFY_SCHEMA = obj(motivo=s(200), respuesta_si=b())
# «sí» = el texto está bien; «no» confirma la sospecha del revisor.
_PREGUNTA = {
    "fuera_de_tema": "¿El texto trata sobre «{concept}» (o es un detalle, paso o ejemplo suyo), en vez de explicar otro tema distinto?",
    "incorrecto": "¿Son técnicamente correctas todas las afirmaciones del texto sobre bases de datos?",
    "incoherente": "¿El texto es coherente y tiene sentido como parte de un recurso sobre «{concept}»?",
    "vacio": "¿El texto aporta información útil para estudiar «{concept}»?",
}

_FIX_PROMPT = """[ROL] Eres redactor de material didáctico universitario de Bases de Datos.
[CONCEPTO] «{concept}»
[TAREA] El recurso JSON de abajo tiene problemas de contenido en algunos campos. Reescribe SOLO esos campos
para que traten correctamente sobre «{concept}», sean técnicamente correctos y mantengan la función del campo
(misma longitud aproximada, mismo tono). Devuelve el JSON COMPLETO; los demás campos déjalos idénticos.
[PROBLEMAS]
{problems}
[RECURSO ACTUAL]
{current}
"""


def fix_fields(
    concept: str,
    data: dict,
    schema: dict,
    problems: list[dict],
    *,
    deadline: float | None = None,
    llm_config=None,
    enabled_models=None,
) -> tuple[dict, int]:
    """Reescribe los campos con problema. Devuelve (data nuevo, campos corregidos).
    Solo se aceptan cambios en las rutas afectadas y el resultado debe validar."""
    plist = "\n".join(f"- {p['campo']} ({p['tipo']}): {p['explicacion']}" for p in problems)
    new = generate_json(
        _FIX_PROMPT.format(
            concept=concept, problems=plist, current=json.dumps(data, ensure_ascii=False, indent=1)
        ),
        schema,
        llm_config=llm_config,
        enabled_models=enabled_models,
        deadline=deadline,
        temperature=0.2,
        attempts=1,
    )
    merged = copy.deepcopy(data)
    changed = 0
    for p in problems:
        try:
            val = get_path(new, p["campo"])
            if isinstance(val, str) and val.strip() and val != get_path(merged, p["campo"]):
                set_path(merged, p["campo"], val)
                changed += 1
        except (KeyError, IndexError, TypeError):
            continue
    if validate(merged, schema):
        return data, 0
    return merged, changed


def review_and_fix(
    concept: str,
    data: dict,
    schema: dict,
    *,
    deadline: float | None = None,
    llm_config=None,
    enabled_models=None,
) -> tuple[dict, ReviewReport]:
    """Revisa y corrige (1 ronda). Nunca lanza."""
    rep = ReviewReport()
    if not enabled():
        rep.enabled = False
        return data, rep
    budget = float(os.getenv("OVA_CONTENT_REVIEW_BUDGET_S", "90"))
    t0 = time.monotonic()
    limit = t0 + budget
    if deadline is not None:
        limit = min(limit, deadline - 20)  # deja margen para imágenes/render
    if time.monotonic() >= limit:
        rep.error = "sin presupuesto de tiempo"
        return data, rep
    try:
        fields = iter_text_fields(data)
        rep.fields = len(fields)
        skip = _prefilter(concept, fields)
        rep.prefiltered = len(skip)
        to_check = [(p, t) for p, t in fields if p not in skip]
        rep.found = review_fields(
            concept, to_check, deadline=limit, llm_config=llm_config, enabled_models=enabled_models
        )
        rep.review_s = time.monotonic() - t0
        if rep.found and time.monotonic() < limit:
            t1 = time.monotonic()
            data, rep.fixed = fix_fields(
                concept, data, schema, rep.found, deadline=limit, llm_config=llm_config, enabled_models=enabled_models
            )
            rep.fix_s = time.monotonic() - t1
    except Exception as exc:  # el revisor nunca tumba el recurso
        rep.error = str(exc)[:200]
        logger.warning("content review failed", concept=concept, error=rep.error)
    logger.info(
        "ova content review",
        concept=concept,
        fields=rep.fields,
        prefiltered=rep.prefiltered,
        found=len(rep.found),
        fixed=rep.fixed,
        review_s=round(rep.review_s, 2),
        fix_s=round(rep.fix_s, 2),
        problems=[(p["campo"], p["tipo"]) for p in rep.found],
    )
    return data, rep


__all__ = ["ReviewReport", "enabled", "review_and_fix", "review_fields"]
