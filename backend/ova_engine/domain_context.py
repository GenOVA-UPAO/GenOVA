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
_DB_RE = re.compile("|".join(f"(?:{t})" for t in _DB_TERMS))

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


def is_db_text(text: str) -> bool:
    """¿El texto trata de Oracle o de bases de datos? Palabras clave, sin LLM."""
    return bool(_DB_RE.search(_fold(text)))


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

    def pick(self, db: str, generic: str) -> str:
        """`db` si el tema es de Oracle/bases de datos; `generic` en cualquier otro."""
        return db if self.is_db else generic

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
        """Línea de curso: solo para temas de bases de datos."""
        return "curso: Sistemas de Gestión de Base de Datos, Oracle" if self.is_db else f"nivel: {self.audiencia}"

    def rules(self) -> str:
        """Bloque de dominio y nivel para el prompt."""
        return (
            f"[DOMINIO] Tema: «{self.topic}». Público: {self.audiencia}. {self.guia_nivel} "
            "Mantente en este tema; los ejemplos, casos y analogías deben ser propios de él y del nivel indicado."
        )


def domain_for(concept: str, contexto: str = "") -> DomainContext:
    """Contexto de dominio del recurso. El dominio se decide con el tema y con el pedido del
    docente («Pedido del docente …»); el material RAG no cuenta para no confundir temas."""
    pedido = ""
    for line in (contexto or "").splitlines():
        if line.startswith("Pedido del docente"):
            pedido = line
            break
    level = detect_level(pedido or f"{concept}\n{contexto}")
    return DomainContext(topic=" ".join((concept or "").split()), level=level, is_db=is_db_text(f"{concept} {pedido}"))
