export interface VersionDiffPhase {
  id: string;
  phase_type: string;
  content?: string;
}

export interface VersionDiffData {
  v1?: {
    version?: { version_number?: number };
    phases?: VersionDiffPhase[];
  };
  v2?: {
    version?: { version_number?: number };
    phases?: VersionDiffPhase[];
  };
}

export interface PhaseMicroVersion {
  id: string;
  minor_number: number;
  content?: string;
  created_at?: string;
}
