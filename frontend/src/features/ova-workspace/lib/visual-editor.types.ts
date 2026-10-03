export interface ResourceBlock {
  id: string;
  tipo: string;
  props: Record<string, unknown>;
}

export interface VisualElement {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
}

export interface VisualSpec {
  root: string;
  elements: Record<string, VisualElement | undefined>;
  state?: Record<string, unknown>;
}

export interface LayaStepTrace {
  index: number;
  choice: string;
  description: string;
  parent: string | null;
  slot: string | null;
  confidence: number | null;
  elapsedMs: number;
  inputTokens: number | null;
  answers?: Record<string, { choice: string; confidence?: number }>;
}

export type IntentAction = "quitar" | "mover" | "anadir" | "reemplazar" | "ninguna";

export interface IntentBlockRef {
  tipo?: string | null;
  indice?: number | "ultimo" | null;
  id?: string | null;
}

export interface IntentDestinoRef {
  tipo?: string | null;
  indice?: number | "ultimo" | null;
  id?: string | null;
}

export interface IntentDestino {
  posicion?: "inicio" | "final" | "antes" | "despues" | null;
  referencia?: IntentDestinoRef | null;
}

export interface InterpretedIntent {
  accion: IntentAction;
  bloque?: IntentBlockRef | null;
  destino?: IntentDestino | null;
  contenido?: string | null;
  confianza: number;
  razon?: string;
  requiere_confirmacion?: boolean;
  motivo?: string;
  es_fuera_de_alcance?: boolean;
  bloque_descripcion?: string | null;
  referencia_resuelta_por_contenido?: boolean;
  post_verificacion_score?: number | null;
}

export interface IntentTrace {
  backend: string;
  elapsedMs: number;
  stepsCount?: number;
  rawResponse?: unknown;
  fallbackUsed?: boolean;
  message?: string;
}

export interface EditResponse {
  intent: InterpretedIntent;
  blocks: ResourceBlock[];
  trace: IntentTrace;
  requiere_confirmacion?: boolean;
  motivo?: string;
}

export interface ConfirmResponse {
  success: boolean;
  message: string;
  html: string;
  version_id?: string;
  version_number?: number;
  minor_number?: number;
}
