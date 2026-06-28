import { type ConfigField, N } from './helpers'

export const ELABORATE_SCHEMA: Record<string, ConfigField[]> = {
  'elaborate:1': [
    N(
      'num_questions',
      'Preguntas',
      3,
      6,
      4,
      'Preguntas progresivas del caso de estudio',
    ),
  ],
  'elaborate:2': [
    N(
      'num_steps',
      'Pasos',
      3,
      7,
      5,
      'Pasos del ejercicio guiado de aplicación',
    ),
  ],
  'elaborate:3': [
    N(
      'num_deliverables',
      'Entregables',
      2,
      5,
      3,
      'Entregables evaluables del mini-proyecto',
    ),
  ],
  'elaborate:4': [
    N(
      'num_params',
      'Parámetros',
      2,
      5,
      3,
      'Parámetros ajustables de la simulación',
    ),
  ],
  'elaborate:5': [
    N(
      'num_questions',
      'Preguntas',
      2,
      5,
      3,
      'Preguntas de exploración en el dashboard',
    ),
  ],
  'elaborate:6': [
    N(
      'num_decisions',
      'Decisiones',
      2,
      4,
      3,
      'Niveles de decisión en el escenario ramificado',
    ),
  ],
  'elaborate:7': [
    N(
      'num_exercises',
      'Ejercicios',
      2,
      5,
      3,
      'Ejercicios de pseudocódigo en el lab',
    ),
  ],
  'elaborate:8': [
    N('num_problems', 'Problemas', 2, 5, 4, 'Problemas del mapa de aplicación'),
  ],
  'elaborate:9': [
    N('num_turns', 'Turnos', 4, 8, 6, 'Turnos del juego de estrategia'),
  ],
  'elaborate:10': [
    N('num_criteria', 'Criterios', 3, 6, 4, 'Criterios de diseño del reto'),
  ],
  // ── EVALUATE ────────────────────────────────────────────────────────────
}
