"""Fuente única del plan de ejecución por recurso (F3.3).

Antes cada nodo de fase tenía su set *_CODE_ONLY y bdi._select_plan_type
inventaba etiquetas que no correspondían a planes reales — las intentions
eran decorativas. Ahora BDI, los nodos de fase (motor legacy) y el work-pool
consultan este mapa, y el worker despacha por `intention.plan_type`.
"""

PODCAST = "podcast"
DIRECT_CODE = "direct_code"
TWO_STEP = "two_step"

# Recursos con generación directa a HTML (existe plantilla [codigo.N] en el TOML).
CODE_ONLY: dict[str, frozenset[int]] = {
    "engage": frozenset({6, 10}),
    "explore": frozenset({1, 6, 10}),
    "explain": frozenset({2, 3, 5, 8, 10}),
    "elaborate": frozenset({4, 5, 7, 9}),
    "evaluate": frozenset({3, 5, 8, 9, 10}),
}

_PODCAST = {("engage", 3)}


def plan_for(phase: str, rt) -> str:
    """Plan de ejecución canónico para un recurso."""
    n = int(rt)
    if (phase, n) in _PODCAST:
        return PODCAST
    if n in CODE_ONLY.get(phase, frozenset()):
        return DIRECT_CODE
    return TWO_STEP


def degraded_plan(phase: str, rt, current: str) -> str | None:
    """Plan más barato para un reintento (deliberación F3.2), o None si no hay.

    two_step → direct_code SOLO si existe plantilla [codigo.N]; el resto no
    tiene degradación segura.
    """
    n = int(rt)
    if current == TWO_STEP and n in CODE_ONLY.get(phase, frozenset()):
        return DIRECT_CODE
    return None


# La ejecución de un plan vive en `prometheus.plans.generate.generate_resource`
# (los llamadores — workpool y repair — la invocan directo). Este módulo queda como
# hoja: solo tablas de selección de plan, sin importar `generate` (rompe el ciclo).
