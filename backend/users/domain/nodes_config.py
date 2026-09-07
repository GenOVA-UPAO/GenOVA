"""Reglas puras de la configuración de nodos del motor (admin).

Validación de flags y rounds; ValueError con los mensajes exactos que el
router traduce a 400. El acceso al motor (prometheus) NO pasa por aquí.
"""

from __future__ import annotations

VALID_FLAGS = {"ova_refine", "ova_critic", "ova_editor"}
VALID_BOOL = {"0", "1"}


def validate_node_updates(payload: dict) -> dict:
    updates: dict = {}
    for k, v in payload.items():
        if k in VALID_FLAGS:
            if str(v) not in VALID_BOOL:
                raise ValueError(f"Flag '{k}' debe ser '0' o '1'")
            updates[k] = str(v)
        elif k == "ova_reflection_rounds":
            try:
                rounds = int(v)
                if not (0 <= rounds <= 3):
                    raise ValueError
                updates[k] = rounds
            except (ValueError, TypeError):
                raise ValueError("ova_reflection_rounds debe ser entero 0-3") from None
    if not updates:
        raise ValueError("Payload vacío o sin flags reconocidos")
    return updates
