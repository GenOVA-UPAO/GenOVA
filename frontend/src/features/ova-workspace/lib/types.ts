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
  status?: string;
  current_version?: {
    version_number?: number;
    phases?: Phase[];
    [key: string]: unknown;
  };
  version_history?: unknown[];
  [key: string]: unknown;
}

export interface ResourcePick {
  id: string;
  [key: string]: unknown;
}

export type Selections = Record<string, ResourcePick[]>;

export interface OvaTheme {
  color: string;
  design: string;
}
