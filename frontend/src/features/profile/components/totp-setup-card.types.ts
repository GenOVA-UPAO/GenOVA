export interface SetupData {
  provisioning_uri: string;
  secret: string;
  backup_codes?: string[];
}

export type TotpPhase = "idle" | "setup" | "enabled";
