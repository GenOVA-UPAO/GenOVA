# Sesiones y recuperación de credenciales (P7)

Todos los JWT nuevos incluyen `aud="genova-api"` e `iss="genova"`. Autenticación y
revocación usan el mismo decoder: firma/algoritmo configurados, audiencia exacta,
emisor exacto y claims `sub`, `iat`, `exp`, `iss`, `jti`, `aud` obligatorios.
`iat`/`exp` deben ser segundos enteros, la expiración posterior a la emisión y se
mantienen las comprobaciones de expiración, cuenta activa, revocación y corte de
credenciales (`password_changed_at`).

## Compatibilidad temporal

Los tokens emitidos antes de P7 no tenían `aud`. Únicamente para ese formato
firmado se admite la ausencia de audiencia si conserva todos sus otros claims
(incluido `email`), el emisor es GenOVA, la emisión es anterior o igual a
`JWT_LEGACY_ISSUED_BEFORE` y su duración no supera 30 días (máximo actual de
"recordarme"). No se acepta una audiencia diferente ni vacía.

El corte por defecto es `1790985600` (2026-10-03 00:00 UTC), fijado para la entrega
P7 del 2026-10-02. La excepción caduca, como máximo, el 2026-11-02 00:00 UTC; los
tokens conservan su expiración original. No se calcula de nuevo al reiniciar,
para evitar prolongar la ventana indefinidamente. Si se despliega en otra fecha,
el operador puede establecer **una vez** el corte del despliegue mediante esta
variable (timestamp Unix). Valor `0` desactiva la compatibilidad inmediatamente.
Tras la transición se debe dejar a `0` o retirar esta excepción.

## Serialización de resets/cambios

El repositorio obtiene inicialmente sólo el propietario del token, bloquea la
fila `users` con `SELECT ... FOR UPDATE`, y después relee/bloquea el token.
Si otra transacción lo eliminó al cambiar la contraseña, el reset se rechaza.
La emisión de tokens y el cambio propio siguen el mismo orden usuario → token;
la contraseña actual se lee bajo el lock y los locks duran hasta commit/rollback.
`populate_existing=True` impide reutilizar credenciales obsoletas del identity map.

No se requieren migraciones. La regresión simula una intercalación reset/cambio
con SQLite y comprueba el SQL de locks compilado para PostgreSQL; SQLite no
implementa locks de fila. No se ha usado una base externa para los tests.
