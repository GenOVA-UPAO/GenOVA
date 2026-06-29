# EN-017 — Panel de Nodos/Agentes Prometheus + Nodo Video + Nodo Imágenes

> Spec completo entregado inline en el prompt de implementación (EN-017).
> Detalle de implementación y trazabilidad en `sdd/progress/implementados/impl_panel-nodos-prometheus.md`.

## Resumen

Panel admin para visualizar y configurar los nodos/agentes del grafo Prometheus:
- Lista de nodos siempre activos (Concierge, 5 fases, Video, Assembler)
- Nodos configurables con toggles: Generador de imágenes, Refinador, Crítico, Editor
- Warning de Video cuando no hay API key configurada
- Config store con TTL 30s en PlatformConfig

## Criterios de aceptación

- R1: GET `/api/admin/nodes-config` retorna lista de 12 nodos + config con defaults cuando no hay DB config
- R2: PUT `/api/admin/nodes-config` guarda flags (ova_images, ova_refine, ova_critic, ova_editor) y ova_reflection_rounds
- R3: PUT con valor inválido retorna 400 sin filtrar detalles de BD
- R4: Flag ova_images="0" desactiva la generación de imágenes en engage
- R5: Nodo Video muestra badge de advertencia cuando video_api_key no está configurada
- R6: Campo rondas del Crítico visible solo cuando ova_critic="1"
- R7: Cambios en config se propagan a los nodos en ~30s (TTL de caché)
