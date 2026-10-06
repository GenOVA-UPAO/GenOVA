import i18n from "i18next";
// La primera línea es el tema sin etiqueta: el backend titula el OVA con el
// inicio del prompt. El nivel lo pone el selector de «Nivel educativo».
export let EXAMPLE_PROMPT = examplePrompt();
i18n.on("languageChanged", () => { EXAMPLE_PROMPT = examplePrompt(); });

export function examplePrompt(): string {
  return i18n.t("workspace:examplePrompt");
}

export const MIN_PROMPT_LENGTH = 10;

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH && phases >= 2 && !busy;
}
