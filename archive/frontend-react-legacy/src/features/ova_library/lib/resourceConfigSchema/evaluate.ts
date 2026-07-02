import { type ConfigField, N } from './helpers'

export const EVALUATE_SCHEMA: Record<string, ConfigField[]> = {
  'evaluate:1': [
    N('num_questions', 'Preguntas', 4, 10, 6, 'Preguntas del quiz interactivo'),
  ],
  'evaluate:2': [
    N(
      'num_criteria',
      'Criterios',
      3,
      6,
      5,
      'Criterios de la rúbrica de autoevaluación',
    ),
  ],
  'evaluate:3': [
    N(
      'num_questions',
      'Preguntas',
      4,
      10,
      8,
      'Preguntas del desafío contrarreloj',
    ),
    N(
      'time_seconds',
      'Segundos',
      30,
      120,
      90,
      'Tiempo total del contador regresivo',
    ),
  ],
  'evaluate:4': [
    N(
      'num_questions',
      'Preguntas',
      5,
      12,
      8,
      'Preguntas del examen de opción múltiple',
    ),
  ],
  'evaluate:5': [
    N(
      'num_sentences',
      'Oraciones',
      4,
      12,
      8,
      'Oraciones con espacio en blanco',
    ),
  ],
  'evaluate:6': [
    N('num_pairs', 'Pares', 4, 8, 6, 'Pares de la actividad de relacionar'),
  ],
  'evaluate:7': [
    N('num_terms', 'Términos', 5, 12, 8, 'Términos del crucigrama conceptual'),
  ],
  'evaluate:8': [
    N(
      'num_questions',
      'Preguntas',
      2,
      5,
      3,
      'Preguntas de desarrollo abiertas',
    ),
  ],
  'evaluate:9': [
    N(
      'num_decisions',
      'Decisiones',
      2,
      5,
      3,
      'Decisiones evaluables en la simulación',
    ),
  ],
  'evaluate:10': [
    N(
      'num_competencias',
      'Competencias',
      2,
      5,
      3,
      'Competencias adquiridas en el diploma',
    ),
  ],
}
