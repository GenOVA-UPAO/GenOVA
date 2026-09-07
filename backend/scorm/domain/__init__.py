"""Núcleo de dominio de SCORM: ensamblado puro del paquete SCORM 1.2.

Sin persistencia ni orquestación: `build_scorm_zip_bytes` toma los datos del OVA y
devuelve los bytes del .zip (en memoria). Por eso este dominio no tiene capas
`application`/`infrastructure` ni `container` — no hay nada que abstraer ni inyectar.
"""

from scorm.domain.package import DEFAULT_PHASES, build_scorm_zip_bytes

__all__ = ["DEFAULT_PHASES", "build_scorm_zip_bytes"]
