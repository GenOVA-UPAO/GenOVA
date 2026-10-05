import i18n from "i18next";

export const TASK_LABELS: Record<string, string> = new Proxy({}, {
  get(_target, prop: string) {
    return i18n.t(`llm-settings:taskLabelsExtended.${prop}`, { defaultValue: prop });
  },
});

export const TASK_DESCS: Record<string, string> = new Proxy({}, {
  get(_target, prop: string) {
    return i18n.t(`llm-settings:taskDescs.${prop}`, { defaultValue: "" });
  },
});


export const MODALITY_SYMBOLS: Record<string, string> = {
  text: "Aa",
  multimodal: "◆",
  image: "◇",
  audio: "♪",
};

export function getModalitySymbol(modality: string): string {
  return MODALITY_SYMBOLS[modality] || "Aa";
}
