import { type ConfigField, N, V } from './helpers'

export const EXPLORE_SCHEMA: Record<string, ConfigField[]> = {
  'explore:1': [
    N(
      'num_iterations',
      'Iteraciones',
      2,
      5,
      3,
      'Iteraciones requeridas para completar el lab',
    ),
  ],
  'explore:2': [
    N('num_turns', 'Turnos', 4, 8, 6, 'Turnos de la sesión socrática'),
  ],
  'explore:3': [
    N('num_rounds', 'Rondas', 3, 8, 6, 'Rondas del juego de clasificación'),
  ],
  'explore:4': [
    V(
      'num_pauses',
      'Pausas activas',
      1,
      5,
      3,
      'Preguntas de pausa activa en el video',
    ),
  ],
  'explore:5': [
    N(
      'num_records',
      'Registros',
      6,
      15,
      8,
      'Registros en el dataset de exploración',
    ),
  ],
  'explore:6': [
    N(
      'num_zones',
      'Zonas/estados',
      2,
      4,
      3,
      'Zonas de comportamiento en el simulador paramétrico',
    ),
  ],
  'explore:7': [
    N('num_steps', 'Pasos', 3, 6, 4, 'Pasos del experimento guiado'),
  ],
  'explore:8': [
    N(
      'num_scenarios',
      'Escenarios',
      2,
      6,
      4,
      'Escenarios de negocio a resolver',
    ),
  ],
  'explore:9': [
    N(
      'num_cards',
      'Tarjetas',
      4,
      8,
      6,
      'Tarjetas de emparejamiento conceptual',
    ),
  ],
  'explore:10': [
    N(
      'num_trials',
      'Pruebas',
      2,
      5,
      3,
      'Pruebas antes de revelar la solución óptima',
    ),
  ],
  // ── EXPLAIN ─────────────────────────────────────────────────────────────
}
