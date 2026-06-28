import { type ConfigField, N, V } from './helpers'

export const EXPLAIN_SCHEMA: Record<string, ConfigField[]> = {
  'explain:1': [
    V(
      'num_markers',
      'Marcadores',
      2,
      5,
      4,
      'Marcadores temporales en el video teórico',
    ),
  ],
  'explain:2': [
    N(
      'num_sections',
      'Secciones',
      2,
      5,
      3,
      'Ideas centrales con ejemplo y pregunta',
    ),
  ],
  'explain:3': [
    N('num_nodes', 'Nodos', 5, 10, 7, 'Nodos del mapa conceptual interactivo'),
  ],
  'explain:4': [
    N('num_questions', 'Preguntas', 4, 10, 6, 'Preguntas del FAQ interactivo'),
  ],
  'explain:5': [
    N('num_steps', 'Pasos', 3, 6, 5, 'Pasos de la animación demostrativa'),
  ],
  'explain:6': [
    N('num_terms', 'Términos', 5, 12, 8, 'Términos del glosario visual'),
  ],
  'explain:7': [
    N('num_milestones', 'Hitos', 3, 6, 5, 'Hitos del timeline histórico'),
  ],
  'explain:8': [
    N('num_blocks', 'Bloques', 3, 8, 5, 'Bloques del diagrama de framework'),
  ],
  'explain:9': [
    N(
      'num_dimensions',
      'Dimensiones',
      3,
      6,
      4,
      'Dimensiones de la tabla comparativa',
    ),
  ],
  'explain:10': [
    N(
      'num_sections',
      'Secciones',
      4,
      8,
      5,
      'Secciones de la infografía interactiva',
    ),
  ],
  // ── ELABORATE ───────────────────────────────────────────────────────────
}
