"""operationId legibles para los clientes generados desde el OpenAPI.

Por defecto FastAPI concatena nombre de función, ruta y método
(`db_health_api_db_health_get`). Aquí se usa `<tag>_<nombre de función>`, que es
lo que acaba siendo el nombre del método en un SDK generado.
"""

import re
import unicodedata

from fastapi.routing import APIRoute


def _slug(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", ascii_value.lower())).strip("_")


def generate_operation_id(route: APIRoute) -> str:
    tag = route.tags[0] if route.tags else "api"
    return f"{_slug(tag)}_{route.name}"
