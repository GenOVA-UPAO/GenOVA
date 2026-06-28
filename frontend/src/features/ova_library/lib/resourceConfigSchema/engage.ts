import { type ConfigField, N } from './helpers'

export const ENGAGE_SCHEMA: Record<string, ConfigField[]> = {
  'engage:1': [
    N('num_panels', 'Viñetas', 3, 8, 5, 'Número de viñetas del cómic generado'),
  ],
  'engage:2': [
    N(
      'duration_seconds',
      'Segundos video',
      20,
      60,
      40,
      'Duración del video de apertura',
    ),
  ],
  'engage:3': [
    N(
      'word_count',
      'Palabras',
      80,
      150,
      110,
      'Extensión del monólogo narrativo',
    ),
  ],
  'engage:4': [
    N('num_rounds', 'Rondas', 2, 6, 3, 'Rondas de detección en el minijuego'),
  ],
  'engage:5': [
    N(
      'num_options',
      'Opciones',
      2,
      4,
      3,
      'Opciones de posición en el dilema ético',
    ),
  ],
  'engage:6': [
    N(
      'body_words',
      'Palabras cuerpo',
      60,
      130,
      90,
      'Extensión del cuerpo de la noticia ficticia',
    ),
  ],
  'engage:7': [
    N(
      'context_words',
      'Palabras contexto',
      50,
      100,
      70,
      'Extensión del contexto del escenario de rol',
    ),
  ],
  'engage:8': [
    N('num_milestones', 'Hitos', 3, 6, 4, 'Hitos históricos en el timeline'),
  ],
  'engage:9': [
    N(
      'num_puzzles',
      'Acertijos',
      2,
      5,
      3,
      'Acertijos encadenados en el escape room',
    ),
  ],
  'engage:10': [
    N(
      'num_controls',
      'Controles',
      1,
      3,
      1,
      'Controles manipulables en el simulador',
    ),
  ],
  // ── EXPLORE ─────────────────────────────────────────────────────────────
}
