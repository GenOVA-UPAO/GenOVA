/**
 * Mapa de componentes wireframe por recurso (fase:id).
 *
 * Los componentes wireframe fueron eliminados del bundle en Fase 5 de la
 * auditoría de Screaming Architecture (2026-06-27).
 * Este mapa ahora está vacío; ResourcePreviewPanel renderiza `null` en la
 * sección "Vista previa" cuando no hay Wireframe disponible (comportamiento
 * ya contemplado en la condición `{Wireframe && ...}`).
 *
 * Si en el futuro se requieren previsualizaciones ricas, implementarlas como
 * componentes en features/ova_library/components/previews/ y registrarlas aquí.
 */
import type { ComponentType } from 'react'

export const RESOURCE_WIREFRAMES: Record<string, ComponentType> = {}
