import type { PreviewMap } from './types'

export const EVALUATE_PREVIEWS: PreviewMap = {
  'evaluate:1': {
    label: 'Quiz Interactivo',
    format: 'HTML + JS interactivo',
    bullets: [
      'Preguntas mixtas con retroalimentación inmediata',
      'Puntuación acumulativa visible',
      'Resumen de aciertos y errores al final',
    ],
  },
  'evaluate:2': {
    label: 'Rúbrica de Autoevaluación',
    format: 'HTML formulario',
    bullets: [
      'Criterios de logro por nivel de desempeño',
      'Escala de valoración interactiva',
      'Reflexión guiada sobre el propio avance',
    ],
  },
  'evaluate:3': {
    label: 'Desafío Contrarreloj',
    format: 'HTML + JS cronómetro',
    bullets: [
      'Preguntas bajo presión de tiempo',
      'Contador regresivo visible',
      'Puntaje diferenciado por velocidad y precisión',
    ],
  },
  'evaluate:4': {
    label: 'Examen Opción Múltiple',
    format: 'HTML + JS interactivo',
    bullets: [
      'Banco de preguntas con opciones mezcladas',
      'Retroalimentación por ítem al finalizar',
      'Nota final con desglose por área',
    ],
  },
  'evaluate:5': {
    label: 'Completar Espacios',
    format: 'HTML + JS interactivo',
    bullets: [
      'Texto con huecos para completar',
      'Validación instantánea de respuestas',
      'Ayudas desbloqueables por intento',
    ],
  },
  'evaluate:6': {
    label: 'Relacionar Conceptos',
    format: 'HTML + JS drag & drop',
    bullets: [
      'Pares de conceptos para emparejar',
      'Retroalimentación visual por acierto',
      'Tiempo y puntuación registrados',
    ],
  },
  'evaluate:7': {
    label: 'Crucigrama Conceptual',
    format: 'HTML + JS interactivo',
    bullets: [
      'Crucigrama generado con términos del contenido',
      'Pistas descriptivas por palabra',
      'Verificación automática al completar',
    ],
  },
  'evaluate:8': {
    label: 'Preguntas de Desarrollo',
    format: 'HTML con editor',
    bullets: [
      'Preguntas abiertas con espacio de respuesta',
      'Criterios de evaluación visibles',
      'Checklist de autoverificación integrado',
    ],
  },
  'evaluate:9': {
    label: 'Simulación Evaluativa',
    format: 'HTML + JS interactivo',
    bullets: [
      'Escenario de aplicación práctica evaluado',
      'Decisiones con impacto medible',
      'Retroalimentación estructurada al finalizar',
    ],
  },
  'evaluate:10': {
    label: 'Diploma de Logro',
    format: 'HTML + CSS imprimible',
    bullets: [
      'Certificado personalizable con nombre del estudiante',
      'Competencias y logros alcanzados',
      'Diseño formal descargable o imprimible',
    ],
  },
}
