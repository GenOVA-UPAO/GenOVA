"""Orquestación de la generación de OVAs (jobs + regeneración).

Subdominio de soporte con routers HTTP propios (jobs, regen). Acoplado a `ova` y
`users` (helpers compartidos) — deuda conocida a resolver cuando esos dominios
pasen por el refactor hexagonal. Enforcement mínimo vía import-linter: no depende
de `roles` ni de `auth.infrastructure`.
"""
