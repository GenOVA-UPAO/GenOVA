// Per-resource configurable parameters for OVA generation.
// Each entry defines fields that affect the backend prompt (counts, toggles).
// Fields with requiresVideo=true are disabled when video API key is not configured.

const N = (key, label, min, max, def, desc = '') => ({ key, label, type: 'number', min, max, default: def, description: desc })
const V = (key, label, min, max, def, desc = '') => ({ key, label, type: 'number', min, max, default: def, requiresVideo: true, description: desc })

export const RESOURCE_CONFIG_SCHEMA = {
  // ── ENGAGE ──────────────────────────────────────────────────────────────
  'engage:1':    [N('num_panels',       'Viñetas',            3,   8,   5, 'Número de viñetas del cómic generado')],
  'engage:2':    [N('duration_seconds', 'Segundos video',    20,  60,  40, 'Duración del video de apertura')],
  'engage:3':    [N('word_count',       'Palabras',          80, 150, 110, 'Extensión del monólogo narrativo')],
  'engage:4':    [N('num_rounds',       'Rondas',             2,   6,   3, 'Rondas de detección en el minijuego')],
  'engage:5':    [N('num_options',      'Opciones',           2,   4,   3, 'Opciones de posición en el dilema ético')],
  'engage:6':    [N('body_words',       'Palabras cuerpo',   60, 130,  90, 'Extensión del cuerpo de la noticia ficticia')],
  'engage:7':    [N('context_words',    'Palabras contexto', 50, 100,  70, 'Extensión del contexto del escenario de rol')],
  'engage:8':    [N('num_milestones',   'Hitos',              3,   6,   4, 'Hitos históricos en el timeline')],
  'engage:9':    [N('num_puzzles',      'Acertijos',          2,   5,   3, 'Acertijos encadenados en el escape room')],
  'engage:10':   [N('num_controls',     'Controles',          1,   3,   1, 'Controles manipulables en el simulador')],
  // ── EXPLORE ─────────────────────────────────────────────────────────────
  'explore:1':   [N('num_iterations',   'Iteraciones',        2,   5,   3, 'Iteraciones requeridas para completar el lab')],
  'explore:2':   [N('num_turns',        'Turnos',             4,   8,   6, 'Turnos de la sesión socrática')],
  'explore:3':   [N('num_rounds',       'Rondas',             3,   8,   6, 'Rondas del juego de clasificación')],
  'explore:4':   [V('num_pauses',       'Pausas activas',     1,   5,   3, 'Preguntas de pausa activa en el video')],
  'explore:5':   [N('num_records',      'Registros',          6,  15,   8, 'Registros en el dataset de exploración')],
  'explore:6':   [N('num_zones',        'Zonas/estados',      2,   4,   3, 'Zonas de comportamiento en el simulador paramétrico')],
  'explore:7':   [N('num_steps',        'Pasos',              3,   6,   4, 'Pasos del experimento guiado')],
  'explore:8':   [N('num_scenarios',    'Escenarios',         2,   6,   4, 'Escenarios de negocio a resolver')],
  'explore:9':   [N('num_cards',        'Tarjetas',           4,   8,   6, 'Tarjetas de emparejamiento conceptual')],
  'explore:10':  [N('num_trials',       'Pruebas',            2,   5,   3, 'Pruebas antes de revelar la solución óptima')],
  // ── EXPLAIN ─────────────────────────────────────────────────────────────
  'explain:1':   [V('num_markers',      'Marcadores',         2,   5,   4, 'Marcadores temporales en el video teórico')],
  'explain:2':   [N('num_sections',     'Secciones',          2,   5,   3, 'Ideas centrales con ejemplo y pregunta')],
  'explain:3':   [N('num_nodes',        'Nodos',              5,  10,   7, 'Nodos del mapa conceptual interactivo')],
  'explain:4':   [N('num_questions',    'Preguntas',          4,  10,   6, 'Preguntas del FAQ interactivo')],
  'explain:5':   [N('num_steps',        'Pasos',              3,   6,   5, 'Pasos de la animación demostrativa')],
  'explain:6':   [N('num_terms',        'Términos',           5,  12,   8, 'Términos del glosario visual')],
  'explain:7':   [N('num_milestones',   'Hitos',              3,   6,   5, 'Hitos del timeline histórico')],
  'explain:8':   [N('num_blocks',       'Bloques',            3,   8,   5, 'Bloques del diagrama de framework')],
  'explain:9':   [N('num_dimensions',   'Dimensiones',        3,   6,   4, 'Dimensiones de la tabla comparativa')],
  'explain:10':  [N('num_sections',     'Secciones',          4,   8,   5, 'Secciones de la infografía interactiva')],
  // ── ELABORATE ───────────────────────────────────────────────────────────
  'elaborate:1': [N('num_questions',    'Preguntas',          3,   6,   4, 'Preguntas progresivas del caso de estudio')],
  'elaborate:2': [N('num_steps',        'Pasos',              3,   7,   5, 'Pasos del ejercicio guiado de aplicación')],
  'elaborate:3': [N('num_deliverables', 'Entregables',        2,   5,   3, 'Entregables evaluables del mini-proyecto')],
  'elaborate:4': [N('num_params',       'Parámetros',         2,   5,   3, 'Parámetros ajustables de la simulación')],
  'elaborate:5': [N('num_questions',    'Preguntas',          2,   5,   3, 'Preguntas de exploración en el dashboard')],
  'elaborate:6': [N('num_decisions',    'Decisiones',         2,   4,   3, 'Niveles de decisión en el escenario ramificado')],
  'elaborate:7': [N('num_exercises',    'Ejercicios',         2,   5,   3, 'Ejercicios de pseudocódigo en el lab')],
  'elaborate:8': [N('num_problems',     'Problemas',          2,   5,   4, 'Problemas del mapa de aplicación')],
  'elaborate:9': [N('num_turns',        'Turnos',             4,   8,   6, 'Turnos del juego de estrategia')],
  'elaborate:10':[N('num_criteria',     'Criterios',          3,   6,   4, 'Criterios de diseño del reto')],
  // ── EVALUATE ────────────────────────────────────────────────────────────
  'evaluate:1':  [N('num_questions',    'Preguntas',          4,  10,   6, 'Preguntas del quiz interactivo')],
  'evaluate:2':  [N('num_criteria',     'Criterios',          3,   6,   5, 'Criterios de la rúbrica de autoevaluación')],
  'evaluate:3':  [
    N('num_questions',  'Preguntas',   4,  10,  8, 'Preguntas del desafío contrarreloj'),
    N('time_seconds',   'Segundos',   30, 120, 90, 'Tiempo total del contador regresivo'),
  ],
  'evaluate:4':  [N('num_questions',    'Preguntas',          5,  12,   8, 'Preguntas del examen de opción múltiple')],
  'evaluate:5':  [N('num_sentences',    'Oraciones',          4,  12,   8, 'Oraciones con espacio en blanco')],
  'evaluate:6':  [N('num_pairs',        'Pares',              4,   8,   6, 'Pares de la actividad de relacionar')],
  'evaluate:7':  [N('num_terms',        'Términos',           5,  12,   8, 'Términos del crucigrama conceptual')],
  'evaluate:8':  [N('num_questions',    'Preguntas',          2,   5,   3, 'Preguntas de desarrollo abiertas')],
  'evaluate:9':  [N('num_decisions',    'Decisiones',         2,   5,   3, 'Decisiones evaluables en la simulación')],
  'evaluate:10': [N('num_competencias', 'Competencias',       2,   5,   3, 'Competencias adquiridas en el diploma')],
}

export function getDefaultConfig(phaseKey, resourceId) {
  const schema = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
  return Object.fromEntries(schema.map((f) => [f.key, f.default]))
}

export function getSchema(phaseKey, resourceId) {
  return RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
}
