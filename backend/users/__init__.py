"""Dominio de usuarios (pase estructural: capas domain/application/infrastructure/interface).

Agrupa varias áreas — administración de usuarios, ajustes de la cuenta propia,
analítica y dashboards por rol. Router: `users.interface.http.router`. ORM:
`users.infrastructure.orm` (User, UserLink) + `orm_platform` (PlatformConfig).
La extracción de cada router a casos de uso es un 2º pase (como en `auth`).
"""
