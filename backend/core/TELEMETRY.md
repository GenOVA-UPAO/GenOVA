# Contenido privado en telemetría (P6)

`TELEMETRY_INCLUDE_CONTENT=false` (valor por defecto) excluye prompts, respuestas
y chunks RAG de telemetría. Es independiente de habilitar Logfire o LangSmith.

- LangSmith/LangGraph: se fuerzan `LANGSMITH_HIDE_INPUTS=true` y
  `LANGSMITH_HIDE_OUTPUTS=true` antes de arrancar la aplicación. Los wrappers
  OpenAI y los `RunTree` propios usan también un cliente explícito con la misma
  política, incluso si se invocan antes del arranque ASGI. Se conservan ids,
  nombres de runs, tiempos y metadatos técnicos; se ocultan los payloads completos.
- Logfire: sigue instrumentando SQLAlchemy y recibiendo logs redactados. No se
  instala la instrumentación OpenAI cuando el contenido está desactivado: el SDK
  instalado captura request/response y **omite el scrubbing de sus spans OpenAI**.
  Por eso no bastaría añadir patrones regex. En este modo no se exportan sus
  spans de tokens/costes. La redacción structlog es recursiva y ocurre antes del
  procesador Logfire, ocultando contenido y nombres de documentos.

`TELEMETRY_INCLUDE_CONTENT=true` requiere reiniciar el proceso y permite captura
de contenido para diagnóstico controlado. No afecta al contenido que se envía
al proveedor LLM para generar respuestas. No se cambia la retención de las cuentas
externas: el operador debe configurar su política y eliminar trazas históricas
con contenido si corresponde; desactivar captura no borra datos ya enviados.

Los nombres de fuentes RAG insertados en prompts se limitan a 200 caracteres de
etiqueta en una sola línea, sin delimitadores, brackets ni caracteres de control.
Se conserva el nombre original en almacenamiento; el saneo se aplica al construir
el contexto (incluyendo documentos multimodales sin texto).
