import type { Palette } from "@/core/lib/ova-palettes";

export interface Phase {
  id: string;
  [key: string]: unknown;
}

export interface PhaseWithContent extends Phase {
  phase_type: string;
  content?: string;
  title?: string;
  regenerated?: boolean;
}

export interface OvaData {
  title?: string;
  status?: string;
  current_version?: {
    version_number?: number;
    phases?: Phase[];
    [key: string]: unknown;
  };
  version_history?: unknown[];
  /** Solo quien creó el OVA lo modifica; el resto (el admin) lo ve en solo lectura. */
  can_edit?: boolean;
  [key: string]: unknown;
}

export interface ResourcePick {
  id: string;
  [key: string]: unknown;
}

export type Selections = Record<string, ResourcePick[]>;

export interface OvaTheme {
  /** "upao" | "free" (la IA elige) | "custom" (la paleta del docente, en `palette`). */
  color: string;
  /** "upao" | "free" (la IA elige). */
  design: string;
  palette?: Palette | null;
}
