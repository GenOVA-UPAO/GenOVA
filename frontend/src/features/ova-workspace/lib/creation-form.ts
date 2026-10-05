import i18n from "i18next";
// La primera línea es el tema sin etiqueta: el backend titula el OVA con el
// inicio del prompt. El nivel lo pone el selector de «Nivel educativo».
export const EXAMPLE_PROMPT =
  i18n.t("workspace:gestion_del_almacenamiento_en_oracle_tablespa_7de72b", { lng: "es" });

export function examplePrompt(): string {
  return i18n.t("workspace:gestion_del_almacenamiento_en_oracle_tablespa_7de72b");
}

export const MIN_PROMPT_LENGTH = 10;

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH && phases >= 2 && !busy;
}
