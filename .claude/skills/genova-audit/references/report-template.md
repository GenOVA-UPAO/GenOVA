# Audit report template

Save at `sdd/audits/<YYYY-MM-DD>-audit.md` (same directory as
`sdd/audits/2026-07-06-ova-recursos-audit.md`).

Note: the report **body itself is written in Spanish** (it's a user-facing
product artifact — see Language policy). This file only gives the structural
template in English for the agent's own instruction.

```markdown
# Auditoría GenOVA — <YYYY-MM-DD>

## Alcance

<todo el repo | dominio específico | feature específica>

## Resumen ejecutivo

<3-6 frases: estado general, cuántos hallazgos por severidad, si hay algún
riesgo crítico que requiere acción inmediata>

| Severidad | Cantidad |
|---|---|
| Crítico | N |
| Alto | N |
| Medio | N |
| Bajo | N |

## Hallazgos — Crítico

### [C4] <título corto>
- **Archivo**: `path/al/archivo.py:123`
- **Escenario de falla**: <input/estado concreto → resultado incorrecto/crash/leak>
- **Remedio propuesto**: <acción concreta>

## Hallazgos — Alto

(mismo formato)

## Hallazgos — Medio

(mismo formato, puede ser más breve)

## Hallazgos — Bajo

(lista compacta, sin necesidad de escenario extenso)

## Quick wins

<hallazgos de remedio inmediato y bajo riesgo, ordenados para hacer primero>

## Deuda estructural de fondo

<hallazgos que requieren un plan (posiblemente vía skill genova-dev con modo
plan) por su tamaño/riesgo — no son quick wins>

## Checkpoints verificados

| Checkpoint | Estado | Notas |
|---|---|---|
| C1 Tests verdes | ✅/❌ | |
| C2 Lint limpio | ✅/❌ | |
| C3 Límite de líneas | ✅/❌ | |
| C4 Seguridad básica | ✅/❌ | |
| C5 Trazabilidad | ✅/❌ | |
| C6 Estado del repo | ✅/❌ | |
| C7 Arquitectura screaming | ✅/❌ | |
| C9 Anti-spaghetti | ✅/❌ | |
| C10 DRY | ✅/❌ | |
| C11 Código muerto | ✅/❌ | |
| C12 Frameworks declarados | ✅/❌ | |
| C13 Responsive | ✅/❌ | |
| C14 ORM cascade | ✅/❌ | |
```
