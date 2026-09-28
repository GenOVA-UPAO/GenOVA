"""Orquestación de la generación de OVAs (jobs + regeneración).

2º pase hexagonal en curso: `domain` / `application` / `infrastructure` /
`interface` / `container` cubren el ciclo de vida de un job. `jobs/` y `regen/`
siguen como capa de compatibilidad (runner, materialize, pipelines).

Enforcement vía import-linter: no depende de `roles` ni de `auth.infrastructure`,
y no toca internos de `ova`.
"""
