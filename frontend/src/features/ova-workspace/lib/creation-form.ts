import i18n from "i18next";
// La primera línea es el tema sin etiqueta: el backend titula el OVA con el
// inicio del prompt. El nivel lo pone el selector de «Nivel educativo».
export let EXAMPLE_PROMPT = examplePrompt();
i18n.on("languageChanged", () => { EXAMPLE_PROMPT = examplePrompt(); });

/** Con un área temática que no es de Oracle, el ejemplo de Oracle confunde: se usa uno del área. */
export function usesAreaExample(area?: string): area is string {
  return Boolean(area?.trim()) && !/\boracle\b/i.test(area ?? "");
}

export function examplePrompt(area?: string): string {
  if (usesAreaExample(area)) return i18n.t("workspace:examplePromptArea", { area: area.trim() });
  return i18n.t("workspace:examplePrompt");
}

export function promptPlaceholder(area?: string): string {
  if (usesAreaExample(area)) return i18n.t("workspace:promptPlaceholderArea", { area: area.trim() });
  return i18n.t("workspace:promptPlaceholder");
}

export const MIN_PROMPT_LENGTH = 10;

export function canCreate(prompt: string, phases: number, busy: boolean): boolean {
  return prompt.trim().length >= MIN_PROMPT_LENGTH && phases >= 2 && !busy;
}
