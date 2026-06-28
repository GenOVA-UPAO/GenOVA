import type { PreviewMap } from './types'

export const ELABORATE_PREVIEWS: PreviewMap = {
  'elaborate:1': {
    label: 'Estudio de Caso',
    format: 'HTML narrativo',
    bullets: [
      'Situación real relacionada al contenido',
      'Preguntas de análisis guiado',
      'Espacio de reflexión y propuesta de solución',
    ],
  },
  'elaborate:2': {
    label: 'Ejercicio Guiado',
    format: 'HTML + JS interactivo',
    bullets: [
      'Problema paso a paso con pistas progresivas',
      'Validación de respuestas por etapa',
      'Retroalimentación detallada al final',
    ],
  },
  'elaborate:3': {
    label: 'Mini-Proyecto',
    format: 'HTML con checklist',
    bullets: [
      'Objetivo, etapas y entregables definidos',
      'Lista de verificación de avance',
      'Rúbrica de autoevaluación integrada',
    ],
  },
  'elaborate:4': {
    label: 'Simulación Aplicada',
    format: 'HTML + JS interactivo',
    bullets: [
      'Escenario real con decisiones consecuentes',
      'Variables dinámicas según elecciones',
      'Resumen de impacto al finalizar',
    ],
  },
  'elaborate:5': {
    label: 'Análisis de Datos',
    format: 'HTML + JS + gráficos',
    bullets: [
      'Dataset contextualizado al tema',
      'Visualizaciones interactivas explorables',
      'Preguntas de interpretación guiadas',
    ],
  },
  'elaborate:6': {
    label: 'Escenario Ramificado',
    format: 'HTML + JS árbol',
    bullets: [
      'Puntos de decisión con múltiples caminos',
      'Consecuencias visibles por elección',
      'Conclusión diferenciada por ruta',
    ],
  },
  'elaborate:7': {
    label: 'Lab de Código',
    format: 'HTML + editor JS',
    bullets: [
      'Editor de código embebido en el OVA',
      'Ejercicios con verificación automática',
      'Soluciones guiadas disponibles',
    ],
  },
  'elaborate:8': {
    label: 'Mapa de Problemas',
    format: 'HTML + SVG interactivo',
    bullets: [
      'Problema central con causas y efectos',
      'Nodos expandibles por área de impacto',
      'Síntesis de relaciones al explorar',
    ],
  },
  'elaborate:9': {
    label: 'Juego de Estrategia',
    format: 'HTML + JS interactivo',
    bullets: [
      'Escenario estratégico con recursos limitados',
      'Decisiones con consecuencias encadenadas',
      'Puntuación y retroalimentación final',
    ],
  },
  'elaborate:10': {
    label: 'Reto de Diseño',
    format: 'HTML con formulario',
    bullets: [
      'Brief de diseño con restricciones claras',
      'Etapas: idear, prototipar, evaluar',
      'Rúbrica de criterios de éxito',
    ],
  },

}
