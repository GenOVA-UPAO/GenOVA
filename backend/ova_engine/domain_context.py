"""Contexto de dominio de un recurso: deriva, sin LLM, el área y el nivel del pedido.

El motor ya no está fijado al curso de bases de datos Oracle. Cada plantilla pide
`domain_for(concept, contexto)` y escribe su rol, sus ejemplos y sus restricciones con
`d.pick(db=..., generic=...)`: el texto Oracle solo se usa cuando el tema trata de
Oracle o de bases de datos (detección determinista por palabras clave); en cualquier
otro tema el prompt es neutro y se adapta al nivel educativo (secundaria, universitario,
posgrado), que llega en el pedido como «Nivel educativo: …».
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass


def _fold(text: str) -> str:
    nfkd = unicodedata.normalize("NFD", text or "")
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower()


# Términos que, por sí solos, indican que el tema es de Oracle o de bases de datos.
_DB_TERMS = (
    r"oracle",
    r"sql",
    r"pl/?sql",
    r"sgbd",
    r"dbms",
    r"rdbms",
    r"dba",
    r"bases? de datos",
    r"database",
    r"tablespace",
    r"rman",
    r"ora-\d+",
    r"b-?tree",
    r"b\+ ?tree",
    r"buffer cache",
    r"\bsga\b",
    r"\bpga\b",
    r"redo log",
    r"savepoint",
    r"interbloqueo",
    r"deadlock",
    r"\bcommit\b",
    r"\brollback\b",
    r"diccionario de datos",
    r"data ?guard",
    r"\bnosql\b",
    r"mongodb",
    r"postgres",
    r"mysql",
)
# Términos que indican Oracle en concreto (no cualquier SGBD): solo con ellos el motor habla
# de Oracle, de sus hechos de referencia y de ejemplos como la SGA o los tablespaces.
_ORACLE_TERMS = (
    r"oracle",
    r"pl/?sql",
    r"tablespaces?",
    r"rman",
    r"ora-\d+",
    r"sga",
    r"pga",
    r"buffer cache",
    r"redo log",
    r"data ?guard",
    r"v\$\w+",
    r"dbms_\w+",
)
_ORACLE_RE = re.compile(r"(?<!\w)(?:" + "|".join(f"(?:{t})" for t in _ORACLE_TERMS) + r")(?!\w)")
# Siempre como palabra completa: sin `\b`, «t-rman-sforman» activaba `rman` y un OVA de
# fotosíntesis salía con Oracle (QA 2026-10-06).
_DB_RE = re.compile(r"\b(?:" + "|".join(f"(?:{t})" for t in _DB_TERMS) + r")\b")

_LEVEL_RE = re.compile(r"nivel educativo\s*:\s*([^.\n]+)", re.IGNORECASE)

_LEVELS = (
    ("posgrado", ("posgrado", "postgrado", "maestria", "doctorado", "especializacion", "master")),
    ("secundaria", ("secundaria", "bachillerato", "preparatoria", "colegio", "escolar", "primaria", "basica", "media")),
    ("universitario", ("universitari", "pregrado", "licenciatura", "grado", "ciclo", "superior", "ingenieria")),
)

_GUIA = {
    "secundaria": "Lenguaje sencillo y cercano, ejemplos de la vida cotidiana y del entorno escolar, sin jerga innecesaria.",
    "universitario": "Rigor conceptual universitario, con ejemplos aplicados a casos reales y vocabulario técnico del área.",
    "posgrado": "Profundidad de posgrado: matices, límites del modelo, casos complejos y lectura crítica.",
    "general": "Nivel claro y accesible para estudiantes del nivel indicado en el pedido; sin jerga innecesaria.",
}
_AUDIENCIA = {
    "secundaria": "estudiantes de secundaria",
    "universitario": "estudiantes universitarios",
    "posgrado": "estudiantes de posgrado",
    "general": "estudiantes",
}
_PRACTICA = {
    "secundaria": "tu vida cotidiana y tus estudios",
    "universitario": "tu futura práctica profesional",
    "posgrado": "tu práctica profesional e investigadora",
    "general": "tu vida diaria y tus estudios",
}


# Área temática del curso que fija el admin (Configuración → Moderación y guardarraíles).
# El job la fotografía al crearse y quien genera abre `area_scope(area)` alrededor del
# trabajo: así `domain_for` y `with_area` la ven en cualquier plantilla o prompt sin tener
# que pasarla por decenas de firmas. Es un ContextVar: cada hilo/tarea tiene la suya y los
# pools que usan `copy_context` la heredan.
_AREA: ContextVar[str] = ContextVar("ova_topic_area", default="")
_AREA_MAX = 200


def clean_area(area: str | None) -> str:
    """El área en una sola línea, sin comillas angulares y acotada («» vacía si no hay)."""
    text = " ".join((area or "").replace("«", " ").replace("»", " ").split())
    return text[:_AREA_MAX].strip()


def current_area() -> str:
    return _AREA.get()


@contextmanager
def area_scope(area: str | None) -> Iterator[str]:
    """Fija el área temática para todo lo que se genere dentro del bloque."""
    cleaned = clean_area(area)
    token = _AREA.set(cleaned)
    try:
        yield cleaned
    finally:
        _AREA.reset(token)


def area_block(area: str, topic: str = "") -> str:
    """Bloque de prompt que ancla el recurso al área («» si no hay área)."""
    area = clean_area(area)
    if not area:
        return ""
    tema = f" Interpreta el tema «{topic}» dentro de esa área (si el término es ambiguo, usa su significado en el área)." if topic else (
        " Interpreta el tema dentro de esa área (si el término es ambiguo, usa su significado en el área)."
    )
    return (
        f"[ÁREA DEL CURSO] Todos los recursos pertenecen al área «{area}».{tema} "
        "Los ejemplos, casos, analogías, personajes y preguntas deben ser del área; "
        "no uses analogías de otras disciplinas como tema principal. "
        "El tema concreto es el FOCO del recurso: el área solo lo desambigua y aporta ejemplos; "
        "NO cambies el tema por otro del área (p. ej. «Seguridad» no es «transacciones», "
        "«Árboles» no es «interbloqueos»)."
    )


def with_area(prompt: str, topic: str = "", area: str | None = None) -> str:
    """`prompt` precedido del bloque del área activa (sin duplicarlo si ya viene)."""
    block = area_block(current_area() if area is None else area, topic)
    if not block or "[ÁREA DEL CURSO]" in prompt:
        return prompt
    return f"{block}\n\n{prompt}"


def is_db_text(text: str) -> bool:
    """¿El texto trata de Oracle o de bases de datos? Palabras clave, sin LLM."""
    return bool(_DB_RE.search(_fold(text)))


def is_oracle_text(text: str) -> bool:
    """¿El texto menciona Oracle en concreto (o PL/SQL, tablespace, SGA, RMAN, ORA-…)?"""
    return bool(_ORACLE_RE.search(_fold(text)))


def detect_level(text: str) -> str:
    """secundaria | universitario | posgrado | general, según «Nivel educativo: …»."""
    m = _LEVEL_RE.search(text or "")
    if not m:
        return "general"
    label = _fold(m.group(1))
    for level, words in _LEVELS:
        if any(w in label for w in words):
            return level
    return "general"


@dataclass(frozen=True)
class DomainContext:
    topic: str
    level: str  # secundaria | universitario | posgrado | general
    is_db: bool
    area: str = ""  # área temática fijada por el admin; vacía si no hay
    is_oracle: bool = False  # el tema, el pedido o el área nombran Oracle

    def pick(self, db: str, generic: str) -> str:
        """`db` si el tema es de bases de datos; `generic` en cualquier otro. Los textos `db`
        no deben nombrar Oracle: para eso `pick3` o `motor`."""
        return db if self.is_db else generic

    def pick3(self, oracle: str, db: str, generic: str) -> str:
        """`oracle` si el tema/área es de Oracle, `db` si es de BD en general, `generic` si no."""
        if self.is_oracle:
            return oracle
        return db if self.is_db else generic

    @property
    def motor(self) -> str:
        """«Oracle» solo si el tema o el área lo piden; si no, un SGBD relacional genérico."""
        return "Oracle" if self.is_oracle else "un SGBD relacional (SQL estándar)"

    @property
    def motor_corto(self) -> str:
        return "Oracle" if self.is_oracle else "el SGBD"

    @property
    def bd_adj(self) -> str:
        """Para «bases de datos {…}»: «Oracle» o «relacionales»."""
        return "Oracle" if self.is_oracle else "relacionales"

    def si_oracle(self, oracle: str, otro: str = "") -> str:
        """`oracle` solo si el tema/área es de Oracle; si no, `otro` (SQL estándar)."""
        return oracle if self.is_oracle else otro

    @property
    def docente(self) -> str:
        """Rol neutro: «docente experto en «tema»»."""
        return f"docente experto en «{self.topic}»"

    @property
    def audiencia(self) -> str:
        return _AUDIENCIA[self.level]

    @property
    def practica(self) -> str:
        """Dónde aplicará lo aprendido (el diploma de secundaria no habla de «práctica profesional»)."""
        return _PRACTICA[self.level]

    @property
    def guia_nivel(self) -> str:
        return _GUIA[self.level]

    @property
    def curso(self) -> str:
        """Línea de curso: solo para temas de bases de datos (Oracle solo si se nombra)."""
        if not self.is_db:
            return f"nivel: {self.audiencia}"
        return "curso: Sistemas de Gestión de Base de Datos" + (", Oracle" if self.is_oracle else "")

    @property
    def para_state(self) -> str:
        """Descripción corta del público y del curso para el `state` del motor de decisión y del
        planner: audiencia, tema/curso (BD solo si el tema o el área lo son) y área activa."""
        out = f"{self.audiencia} ({self.curso})"
        if self.area:
            out += f". Área temática del curso: «{self.area}»: el tema se interpreta dentro de ella"
        return out

    def rules(self) -> str:
        """Bloque de dominio y nivel para el prompt."""
        base = (
            f"[DOMINIO] Tema: «{self.topic}». Público: {self.audiencia}. {self.guia_nivel} "
            "Mantente en este tema; los ejemplos, casos y analogías deben ser propios de él y del nivel indicado."
        )
        block = area_block(self.area, self.topic)
        return f"{block}\n{base}" if block else base


def domain_for(concept: str, contexto: str = "", area: str | None = None) -> DomainContext:
    """Contexto de dominio del recurso. El dominio se decide con el tema, el pedido del
    docente («Pedido del docente …») y el área temática (la del `area_scope` activo si no se
    pasa); el material RAG no cuenta para no confundir temas. Un área de bases de datos hace
    `is_db` verdadero aunque el tema sea ambiguo («Árboles», «Normalización»)."""
    area = clean_area(current_area() if area is None else area)
    pedido = ""
    for line in (contexto or "").splitlines():
        if line.startswith("Pedido del docente"):
            pedido = line
            break
    level = detect_level(pedido or f"{concept}\n{contexto}")
    return DomainContext(
        topic=" ".join((concept or "").split()),
        level=level,
        is_db=is_db_text(f"{concept} {pedido} {area}"),
        area=area,
        is_oracle=is_oracle_text(f"{concept} {pedido} {area}"),
    )
