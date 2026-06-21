// Per-resource configurable parameters for OVA generation.
// Each entry defines fields that affect the backend prompt (counts, toggles).
// Fields with requiresVideo=true are disabled when video API key is not configured.

const N = (key, label, min, max, def) => ({ key, label, type: 'number', min, max, default: def })
const V = (key, label, min, max, def) => ({ key, label, type: 'number', min, max, default: def, requiresVideo: true })

export const RESOURCE_CONFIG_SCHEMA = {
  // ── ENGAGE ──────────────────────────────────────────────────────────────
  'engage:1':    [N('num_panels',       'Viñetas',            3,   8,   5)],
  'engage:2':    [N('duration_seconds', 'Segundos video',    20,  60,  40)],
  'engage:3':    [N('word_count',       'Palabras',          80, 150, 110)],
  'engage:4':    [N('num_rounds',       'Rondas',             2,   6,   3)],
  'engage:5':    [N('num_options',      'Opciones',           2,   4,   3)],
  'engage:6':    [N('body_words',       'Palabras cuerpo',   60, 130,  90)],
  'engage:7':    [N('context_words',    'Palabras contexto', 50, 100,  70)],
  'engage:8':    [N('num_milestones',   'Hitos',              3,   6,   4)],
  'engage:9':    [N('num_puzzles',      'Acertijos',          2,   5,   3)],
  'engage:10':   [N('num_controls',     'Controles',          1,   3,   1)],
  // ── EXPLORE ─────────────────────────────────────────────────────────────
  'explore:1':   [N('num_iterations',   'Iteraciones',        2,   5,   3)],
  'explore:2':   [N('num_turns',        'Turnos',             4,   8,   6)],
  'explore:3':   [N('num_rounds',       'Rondas',             3,   8,   6)],
  'explore:4':   [V('num_pauses',       'Pausas activas',     1,   5,   3)],
  'explore:5':   [N('num_records',      'Registros',          6,  15,   8)],
  'explore:6':   [N('num_zones',        'Zonas/estados',      2,   4,   3)],
  'explore:7':   [N('num_steps',        'Pasos',              3,   6,   4)],
  'explore:8':   [N('num_scenarios',    'Escenarios',         2,   6,   4)],
  'explore:9':   [N('num_cards',        'Tarjetas',           4,   8,   6)],
  'explore:10':  [N('num_trials',       'Pruebas',            2,   5,   3)],
  // ── EXPLAIN ─────────────────────────────────────────────────────────────
  'explain:1':   [V('num_markers',      'Marcadores',         2,   5,   4)],
  'explain:2':   [N('num_sections',     'Secciones',          2,   5,   3)],
  'explain:3':   [N('num_nodes',        'Nodos',              5,  10,   7)],
  'explain:4':   [N('num_questions',    'Preguntas',          4,  10,   6)],
  'explain:5':   [N('num_steps',        'Pasos',              3,   6,   5)],
  'explain:6':   [N('num_terms',        'Términos',           5,  12,   8)],
  'explain:7':   [N('num_milestones',   'Hitos',              3,   6,   5)],
  'explain:8':   [N('num_blocks',       'Bloques',            3,   8,   5)],
  'explain:9':   [N('num_dimensions',   'Dimensiones',        3,   6,   4)],
  'explain:10':  [N('num_sections',     'Secciones',          4,   8,   5)],
  // ── ELABORATE ───────────────────────────────────────────────────────────
  'elaborate:1': [N('num_questions',    'Preguntas',          3,   6,   4)],
  'elaborate:2': [N('num_steps',        'Pasos',              3,   7,   5)],
  'elaborate:3': [N('num_deliverables', 'Entregables',        2,   5,   3)],
  'elaborate:4': [N('num_params',       'Parámetros',         2,   5,   3)],
  'elaborate:5': [N('num_questions',    'Preguntas',          2,   5,   3)],
  'elaborate:6': [N('num_decisions',    'Decisiones',         2,   4,   3)],
  'elaborate:7': [N('num_exercises',    'Ejercicios',         2,   5,   3)],
  'elaborate:8': [N('num_problems',     'Problemas',          2,   5,   4)],
  'elaborate:9': [N('num_turns',        'Turnos',             4,   8,   6)],
  'elaborate:10':[N('num_criteria',     'Criterios',          3,   6,   4)],
  // ── EVALUATE ────────────────────────────────────────────────────────────
  'evaluate:1':  [N('num_questions',    'Preguntas',          4,  10,   6)],
  'evaluate:2':  [N('num_criteria',     'Criterios',          3,   6,   5)],
  'evaluate:3':  [
    N('num_questions',  'Preguntas',   4,  10,  8),
    N('time_seconds',   'Segundos',   30, 120, 90),
  ],
  'evaluate:4':  [N('num_questions',    'Preguntas',          5,  12,   8)],
  'evaluate:5':  [N('num_sentences',    'Oraciones',          4,  12,   8)],
  'evaluate:6':  [N('num_pairs',        'Pares',              4,   8,   6)],
  'evaluate:7':  [N('num_terms',        'Términos',           5,  12,   8)],
  'evaluate:8':  [N('num_questions',    'Preguntas',          2,   5,   3)],
  'evaluate:9':  [N('num_decisions',    'Decisiones',         2,   5,   3)],
  'evaluate:10': [N('num_competencias', 'Competencias',       2,   5,   3)],
}

export function getDefaultConfig(phaseKey, resourceId) {
  const schema = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
  return Object.fromEntries(schema.map((f) => [f.key, f.default]))
}

export function getSchema(phaseKey, resourceId) {
  return RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
}
