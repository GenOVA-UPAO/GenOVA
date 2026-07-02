import type { PreviewMap } from './types'

export const EXPLAIN_PREVIEWS: PreviewMap = {
  'explain:1': {
    label: 'Video Teórico',
    format: 'Guion de video HTML',
    bullets: [
      'Explicación conceptual estructurada',
      'Ejemplos visuales y analogías integradas',
      'Resumen al final con puntos clave',
    ],
  },
  'explain:2': {
    label: 'Lectura Guiada',
    format: 'HTML con anotaciones',
    bullets: [
      'Texto académico adaptado al nivel',
      'Marginalia y recuadros de énfasis',
      'Preguntas de comprensión al final',
    ],
  },
  'explain:3': {
    label: 'Mapa Conceptual',
    format: 'HTML + SVG interactivo',
    bullets: [
      'Conceptos interconectados con relaciones etiquetadas',
      'Niveles de profundidad expandibles',
      'Descripción emergente por nodo',
    ],
  },
  'explain:4': {
    label: 'FAQ Interactivo',
    format: 'HTML acordeón',
    bullets: [
      'Preguntas frecuentes organizadas por tema',
      'Respuestas expandibles con detalle',
      'Búsqueda y filtro de preguntas',
    ],
  },
  'explain:5': {
    label: 'Demo Animada',
    format: 'HTML + CSS animado',
    bullets: [
      'Secuencia animada de un proceso o concepto',
      'Pausa y avance manual por el estudiante',
      'Descripción paso a paso integrada',
    ],
  },
  'explain:6': {
    label: 'Glosario Visual',
    format: 'HTML interactivo',
    bullets: [
      'Términos clave con definición y ejemplo',
      'Imagen o ícono asociado por término',
      'Búsqueda y orden alfabético',
    ],
  },
  'explain:7': {
    label: 'Línea de Tiempo',
    format: 'HTML + CSS + JS',
    bullets: [
      'Eventos ordenados cronológicamente',
      'Descripción detallada por hito',
      'Filtro por período o categoría',
    ],
  },
  'explain:8': {
    label: 'Diagrama de Framework',
    format: 'HTML + SVG interactivo',
    bullets: [
      'Estructura conceptual del modelo o marco',
      'Componentes con descripción emergente',
      'Relaciones y flujos visualizados',
    ],
  },
  'explain:9': {
    label: 'Tabla Comparativa',
    format: 'HTML tabla interactiva',
    bullets: [
      'Elementos comparados en filas y columnas',
      'Filtros y ordenamiento dinámico',
      'Celdas con detalle expandible',
    ],
  },
  'explain:10': {
    label: 'Infografía Interactiva',
    format: 'HTML + SVG + JS',
    bullets: [
      'Datos visualizados con íconos y gráficos',
      'Tooltips informativos por sección',
      'Diseño visual atractivo y conciso',
    ],
  },

}
