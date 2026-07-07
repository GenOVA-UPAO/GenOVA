# BU-006: Micro-Podcast (engage:3) nunca usa la key Groq de plataforma — TTS siempre degrada a texto

> Metadata (de `sdd/backlog.md` + ciclo del bug):

| Campo | Valor |
|---|---|
| ID | BU-006 |
| Tipo | Bug |
| Épica/Tema | EP-3: Generación de OVAs (Prometheus) |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Media |
| Estimación | 1 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-07-07 |
| Fecha actualización | 2026-07-07 |
| Fecha Fin (info) | 2026-07-07 |

## Ruta de guardado
`sdd/bugs/BU-006_podcast-tts-ignora-groq-key-de-plataforma.md`

## Resumen
Reconfirmado durante el re-audit 2026-07-07 (4 OVAs en paralelo, deploy develop
real): `engage:3 Micro-Podcast` siempre degrada a solo-texto. El audit
2026-07-06 (#4) lo había diagnosticado como "Connection error" tras 2 retries
del modelo Orpheus y recomendó loggear tipo/status + fallback `playai-tts`
(ya implementado). Con el logging mejorado, la causa real quedó expuesta:

```
Podcast TTS failed, falling back to text-only: The api_key client option must
be set either by passing api_key to the client or by setting the
GROQ_API_KEY environment variable
```

No es un problema de red ni de modelo deprecado — el cliente Groq del podcast
nunca tiene API key, en NINGÚN entorno donde `GROQ_API_KEY` no esté seteada
como variable de entorno cruda, aunque el panel "Keys Globales Admin"
(`/models`) muestre Groq configurado.

## Causa raíz
`backend/llm/podcast/audio_helpers.py::_client()` resolvía la key así:
```python
key = resolve_key("groq", None) or os.getenv("GROQ_API_KEY", "")
```
`resolve_key(provider, user_api_keys, db=None, user_id=None)` solo consulta la
tabla `platform_config` (tier 3 de la cadena documentada en su propio
docstring) **si recibe `db`**. Aquí se llama sin `db` → ese tier se salta
siempre → sólo queda el env var crudo, vacío en develop (y potencialmente en
producción si nadie definió `GROQ_API_KEY` a mano). El resto del sistema
(`llm/router.py`, `llm/clients/clients.py`) resuelve keys vía
`_get_provider_key(provider)`, que sí abre su propia sesión de DB
(`SessionLocal()`) antes de llamar a `resolve_key(..., db)` — el podcast era el
único call-site que no seguía ese patrón.

## Fix
`_client()` ahora usa el mismo resolver que el resto del LLM stack:
```python
from llm.clients.clients import _get_provider_key
key = _get_provider_key("groq")
return Groq(api_key=key or None)
```
Con esto el podcast hereda automáticamente la key de plataforma configurada en
`/models` → "Keys Globales Admin" sin depender de `GROQ_API_KEY` como env var.
Test de regresión: `backend/tests/test_podcast_audio_helpers.py` (monkeypatcha
`_get_provider_key` y verifica que el cliente recibe esa key).

## Invariante (backprop §V)
Cualquier call-site que necesite una API key de proveedor **debe** resolverla
vía `llm.clients.clients._get_provider_key(provider)` (o pasar un `db` real a
`resolve_key`) — nunca llamar a `resolve_key(provider, None)` sin `db`, porque
eso salta silenciosamente el tier de keys de plataforma.
