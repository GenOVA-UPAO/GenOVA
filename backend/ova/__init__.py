"""Dominio OVA (pase estructural: capas domain/application/infrastructure/interface).

Es el agregado central de la app. Router: `ova.interface.http.router` + los
routers montados de edición/fases/papelera/chat. ORM:
`ova.infrastructure.orm` (Ova, OvaPhase, OvaPhaseVersion, OvaVersion) +
`orm_chat` (OvaEditorChatMessage). La extracción de cada router a casos de uso
es un 2º pase (como en `auth`/`users`).
"""
