# ⚠️ SUPERSEDED — ver sdd/specs/HU-011_editar_ova_generado.md (banner superior).
#
# El editor form legacy (/mis-ovas/{id}/editar, EditarOvaPage) fue eliminado.
# La edición vive ahora en el workspace unificado (/ova/:ovaId/workspace).
# Los escenarios originales de HU-011 se cubren en las features del workspace:
#
#   CA-01, CA-02  → features/ova/HU-030_mis-ovas-workspace.feature
#   CA-03         → features/ova/HU-025_workspace.feature        (acceso/cáscara)
#   CA-04         → features/ova/HU-025_workspace.feature        (↺ Regenerar OVA completo)
#   CA-05, CA-07  → features/ova/HU-026_click-to-edit.feature    (editar/regenerar recurso)
#   CA-06         → features/ova/HU-025_workspace.feature        (Preview / Code)
#   CA-08         → features/ova/HU-027_seleccion-recursos.feature (Seleccionar recursos → Aplicar)
#   CA-09, CA-10  → features/ova/HU-028_versionado.feature       (versión vN + ⏱ Historial)
#   CA-11         → features/ova/HU-025_workspace.feature        (⤓ SCORM)
#
# Este archivo no se ejecuta (no está en cucumber.unit.config.mjs ni en
# playwright.config.js); se conserva como puntero de trazabilidad.
Feature: HU-011 — Editar OVA Generado (SUPERSEDED por el workspace unificado HU-025…HU-030)

  Scenario: La edición de OVA vive en el workspace unificado
    Given el editor form legacy "/mis-ovas/{id}/editar" fue eliminado
    Then la edición de un OVA ocurre en "/ova/{id}/workspace" (ver features HU-025…HU-030)
