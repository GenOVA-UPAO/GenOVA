// Per-resource configurable parameters for OVA generation.
// Each entry defines fields that affect the backend prompt (counts, toggles).
// Fields with requiresVideo=true are disabled when video API key is not configured.

const N = (key, label, min, max, def) => ({ key, label, type: 'number', min, max, default: def })
const V = (key, label, min, max, def) => ({ key, label, type: 'number', min, max, default: def, requiresVideo: true })

export const RESOURCE_CONFIG_SCHEMA = {
  'engage:1':    [N('num_panels',     'Viñetas',            3,  8,   5)],
  'engage:4':    [N('num_rounds',     'Rondas',             2,  6,   3)],
  'engage:8':    [N('num_milestones', 'Hitos',              3,  6,   4)],
  'engage:9':    [N('num_puzzles',    'Acertijos',          2,  5,   3)],
  'explore:2':   [N('num_turns',      'Turnos',             4,  8,   6)],
  'explore:3':   [N('num_rounds',     'Rondas',             3,  8,   6)],
  'explore:4':   [V('num_pauses',     'Pausas activas',     1,  5,   3)],
  'explore:7':   [N('num_steps',      'Pasos',              3,  6,   4)],
  'explain:1':   [V('num_markers',    'Marcadores',         2,  5,   4)],
  'explain:4':   [N('num_questions',  'Preguntas',          4, 10,   6)],
  'explain:6':   [N('num_terms',      'Términos',           5, 12,   8)],
  'explain:7':   [N('num_milestones', 'Hitos',              3,  6,   5)],
  'explain:9':   [N('num_dimensions', 'Dimensiones',        3,  6,   4)],
  'elaborate:1': [N('num_questions',  'Preguntas',          3,  6,   4)],
  'elaborate:3': [N('num_deliverables','Entregables',       2,  5,   3)],
  'elaborate:6': [N('num_decisions',  'Decisiones',         2,  4,   3)],
  'elaborate:8': [N('num_problems',   'Problemas',          2,  5,   4)],
  'evaluate:1':  [N('num_questions',  'Preguntas',          4, 10,   6)],
  'evaluate:2':  [N('num_criteria',   'Criterios',          3,  6,   5)],
  'evaluate:4':  [N('num_questions',  'Preguntas',          5, 12,   8)],
  'evaluate:6':  [N('num_pairs',      'Pares',              4,  8,   6)],
  'evaluate:7':  [N('num_terms',      'Términos',           5, 12,   8)],
  'evaluate:8':  [N('num_questions',  'Preguntas',          2,  5,   3)],
  'evaluate:3':  [
    N('num_questions',  'Preguntas',  4, 10,  8),
    N('time_seconds',   'Segundos',  30, 120, 90),
  ],
}

export function getDefaultConfig(phaseKey, resourceId) {
  const schema = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
  return Object.fromEntries(schema.map((f) => [f.key, f.default]))
}

export function getSchema(phaseKey, resourceId) {
  return RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
}
