"""Tabla declarativa recurso -> requisitos / afinidades para el planner por atributos.

Cada recurso 5E (fase, n) declara:
  prior  prior pedagógico base (0..1) dentro de su fase: qué tan útil es el recurso
         cuando el tema no dice nada especial (p. ej. un Quiz casi siempre sirve; un
         Diploma casi nunca).
  aff    afinidades por atributo del tema: peso * fuerza_atributo (0..1) se SUMA al
         score. Un peso negativo penaliza (p. ej. los simuladores no encajan con un
         tema puramente histórico: no hay nada que manipular).
  req    requisitos duros: atributo -> umbral. Si el tema NO cumple el atributo
         (fuerza < umbral) el recurso recibe `REQ_PENALTY` (queda fuera salvo que no
         haya alternativas). Es la «penalización de inadecuados».
  req_any como `req` pero basta con que cumpla UNO de los atributos listados.
  modal  familia de interacción; se usa para la diversidad (no 3 de la misma familia).
  nivel  exigencia cognitiva 1-5; ordena los 3 elegidos de la fase (progresión).

Atributos del tema (los pregunta el perfil, ver `planner_attrs.ATTRIBUTES`):
  historico, compara, procedimiento, etico, tuning, abstracto, codigo, fallo,
  componentes, diagnostico, clasificacion, avanzado.

Las reglas son criterios pedagógicos generales (qué necesita cada formato para tener
sentido), no listas de temas.
"""

from __future__ import annotations

from dataclasses import dataclass, field

REQ_PENALTY = 1.5
REQ_THRESHOLD = 0.5


@dataclass(frozen=True)
class Resource:
    name: str
    modal: str
    nivel: int
    prior: float
    aff: dict[str, float] = field(default_factory=dict)
    req: dict[str, float] = field(default_factory=dict)
    req_any: tuple[str, ...] = ()


def _r(name, modal, nivel, prior, aff=None, req=None, req_any=()):
    return Resource(name, modal, nivel, prior, aff or {}, req or {}, tuple(req_any))


# modal: narrativa, juego, simulacion, lectura, visual, caso, practica, dialogo, evaluacion
TABLE: dict[str, dict[int, Resource]] = {
    "engage": {
        1: _r("Cómic Interactivo", "narrativa", 1, 0.55, {"abstracto": 0.15, "fallo": 0.1, "avanzado": -0.15}),
        2: _r("Storyboard de Video", "narrativa", 1, 0.40, {"procedimiento": 0.15, "avanzado": -0.15}),
        3: _r("Micro-Podcast", "narrativa", 1, 0.35, {"historico": 0.2}),
        4: _r("Juego de Gamificación", "juego", 2, 0.45, {"clasificacion": 0.1, "historico": -0.3}),
        5: _r("Dilema Ético", "caso", 3, 0.10, {"etico": 0.8}, req={"etico": REQ_THRESHOLD}),
        6: _r("Noticia de Impacto", "narrativa", 2, 0.60, {"fallo": 0.3, "etico": 0.25, "diagnostico": 0.15, "historico": -0.1}),
        7: _r("Juego de Roles", "juego", 3, 0.35, {"fallo": 0.2, "etico": 0.2, "historico": -0.2}),
        8: _r("Timeline Interactivo", "narrativa", 2, 0.0, {"historico": 1.0}, req={"historico": REQ_THRESHOLD}),
        9: _r("Escape Room Virtual", "juego", 3, 0.20, {"fallo": 0.4, "diagnostico": 0.3, "historico": -0.4, "avanzado": 0.15}),
        10: _r("Simulador Intuitivo", "simulacion", 2, 0.60, {"abstracto": 0.2, "tuning": 0.3, "historico": -0.5, "avanzado": 0.1}),
    },
    "explore": {
        1: _r("Simulador Virtual Lab", "simulacion", 3, 0.60, {"procedimiento": 0.2, "fallo": 0.3, "codigo": 0.15, "tuning": 0.1, "diagnostico": 0.2, "historico": -0.6}),
        2: _r("Agente Socrático", "dialogo", 2, 0.35, {"abstracto": 0.25, "etico": 0.2, "compara": 0.1}),
        3: _r("Juego Drag & Drop", "visual", 2, 0.40, {"clasificacion": 0.5, "compara": 0.2, "componentes": 0.3, "procedimiento": 0.2, "historico": -0.2}),
        4: _r("Video con Pausa Activa", "lectura", 1, 0.05, {"avanzado": -0.2}),
        5: _r("Lectura Interactiva", "lectura", 1, 0.25, {"historico": 0.5, "abstracto": 0.1, "etico": 0.1}),
        6: _r("Simulador de Slider", "simulacion", 2, 0.10, {"tuning": 0.8, "compara": 0.1, "historico": -0.5}),
        7: _r("Experimento Guiado", "simulacion", 3, 0.55, {"procedimiento": 0.3, "fallo": 0.15, "codigo": 0.2, "etico": 0.1, "historico": -0.6}),
        8: _r("Juego de Roles", "juego", 3, -0.10, {"etico": 0.2}),
        9: _r("Mapa Mental", "visual", 2, 0.30, {"historico": 0.4, "clasificacion": 0.3, "compara": 0.2, "componentes": 0.15, "abstracto": 0.1}),
        10: _r("Lab de Hipótesis", "simulacion", 4, 0.50, {"fallo": 0.2, "diagnostico": 0.2, "etico": 0.15, "codigo": 0.1, "abstracto": 0.1, "historico": -0.5}),
    },
    "explain": {
        1: _r("Video Teórico", "lectura", 1, 0.45, {"abstracto": 0.2}),
        2: _r("Lectura Guiada", "lectura", 2, 0.40, {"abstracto": 0.15, "etico": 0.25, "diagnostico": 0.1, "historico": 0.1}),
        3: _r("Mapa Conceptual", "visual", 2, 0.55, {"componentes": 0.3, "abstracto": 0.15, "clasificacion": 0.2}),
        4: _r("FAQ Interactivo", "lectura", 2, 0.30, {"etico": 0.1, "avanzado": 0.25, "tuning": 0.15}),
        5: _r("Demo Animada", "simulacion", 3, 0.50, {"procedimiento": 0.4, "fallo": 0.2, "codigo": 0.2, "tuning": 0.1, "diagnostico": 0.1, "avanzado": 0.2}),
        6: _r("Glosario Visual", "lectura", 1, 0.25, {"clasificacion": 0.3, "tuning": 0.1, "historico": -0.2}),
        7: _r("Línea de Tiempo", "narrativa", 2, 0.0, {"historico": 1.0}, req={"historico": REQ_THRESHOLD}),
        8: _r("Diagrama de Framework", "visual", 3, 0.55, {"componentes": 0.4, "procedimiento": 0.2, "fallo": 0.25, "compara": 0.2, "historico": -0.1}),
        9: _r("Tabla Comparativa", "visual", 3, 0.10, {"compara": 1.0, "clasificacion": 0.3}, req_any=("compara", "clasificacion")),
        10: _r("Infografía Interactiva", "visual", 2, 0.30, {"abstracto": 0.1, "clasificacion": 0.2, "historico": 0.1}),
    },
    "elaborate": {
        1: _r("Estudio de Caso", "caso", 3, 0.55, {"etico": 0.3, "historico": 0.5, "compara": 0.15, "diagnostico": 0.1, "fallo": 0.15}),
        2: _r("Ejercicio Guiado", "practica", 2, 0.60, {"procedimiento": 0.4, "codigo": 0.2, "tuning": 0.1, "historico": -0.4}),
        3: _r("Mini-Proyecto", "practica", 4, 0.35, {"codigo": 0.15, "procedimiento": 0.1, "avanzado": 0.25}),
        4: _r("Simulación Aplicada", "simulacion", 3, 0.50, {"tuning": 0.5, "fallo": 0.2, "historico": -0.6}),
        5: _r("Análisis de Datos", "practica", 4, 0.30, {"diagnostico": 0.7, "tuning": 0.3, "avanzado": 0.2, "historico": -0.4}),
        6: _r("Escenario Ramificado", "caso", 4, 0.40, {"fallo": 0.5, "etico": 0.4, "compara": 0.25}),
        7: _r("Lab de Código", "simulacion", 3, 0.10, {"codigo": 0.9, "procedimiento": 0.2, "historico": -0.6}),
        8: _r("Mapa de Problemas", "visual", 3, 0.15, {"diagnostico": 0.4, "fallo": 0.3, "componentes": 0.2, "historico": 0.3}),
        9: _r("Juego de Estrategia", "juego", 4, -0.20, {}),
        10: _r("Reto de Diseño", "practica", 5, 0.25, {"compara": 0.2, "clasificacion": 0.1, "historico": 0.2, "avanzado": 0.2, "tuning": 0.1}),
    },
    "evaluate": {
        1: _r("Quiz Interactivo", "evaluacion", 2, 0.65),
        2: _r("Rúbrica de Autoevaluación", "reflexion", 3, 0.15, {"etico": 0.1, "avanzado": 0.1}),
        3: _r("Desafío Contrarreloj", "juego", 3, 0.30, {"fallo": 0.3, "diagnostico": 0.25, "avanzado": 0.2}),
        4: _r("Examen Opción Múltiple", "evaluacion", 2, 0.35),
        5: _r("Completar Espacios", "evaluacion", 2, 0.50, {"codigo": 0.3, "procedimiento": 0.25, "tuning": 0.1, "historico": -0.3}),
        6: _r("Relacionar Conceptos", "evaluacion", 2, 0.60, {"compara": 0.2, "clasificacion": 0.3, "componentes": 0.25, "historico": 0.2}),
        7: _r("Crucigrama Conceptual", "juego", 1, 0.05, {"clasificacion": 0.1}),
        8: _r("Preguntas de Desarrollo", "reflexion", 4, 0.25, {"etico": 0.35, "compara": 0.15, "abstracto": 0.1, "avanzado": 0.3, "historico": 0.3}),
        9: _r("Simulación Evaluativa", "simulacion", 5, 0.35, {"fallo": 0.4, "diagnostico": 0.35, "tuning": 0.25, "codigo": 0.2, "procedimiento": 0.2, "historico": -0.8}),
        10: _r("Diploma de Logro", "juego", 1, -0.30, {}),
    },
}

ATTRS = ("historico", "compara", "procedimiento", "etico", "tuning", "abstracto", "codigo",
         "fallo", "componentes", "diagnostico", "clasificacion", "avanzado")
