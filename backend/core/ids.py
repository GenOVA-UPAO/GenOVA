"""Validación de identificadores que llegan desde la URL.

Las claves primarias son UUID en PostgreSQL: comparar una columna UUID con un
texto que no lo es aborta la consulta con `InvalidTextRepresentation`, que sin
esta comprobación se propaga como 500. Un identificador mal formado es un error
del cliente, así que se detecta antes de tocar la base de datos.
"""

import uuid


def is_uuid(value: object) -> bool:
    """`True` solo si `value` es un UUID válido en su representación textual."""
    if not isinstance(value, str) or not value:
        return False
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True
