import i18n, { t } from "i18next";

const TASK_KEYS = ["texto", "codigo", "orquestador", "razonamiento"] as const;

export const TASK_LABELS: Record<string, string> = new Proxy({}, {
  get: (_, prop: string) => {
    const key = `llm-settings:labels.tasks.${prop}`;
    return i18n.exists(key) ? t(key) : prop;
  },
  ownKeys: () => [...TASK_KEYS],
  getOwnPropertyDescriptor: (_, prop: string) => ({
    value: TASK_LABELS[prop],
    enumerable: true,
    configurable: true,
  }),
});

const TYPE_KEYS = [
  "all",
  "texto",
  "codigo",
  "razonamiento",
  "multimodal",
  "imagen",
  "video",
  "embedding",
  "audio",
  "moderacion",
] as const;

export const TYPE_LABELS: Record<string, string> = new Proxy({}, {
  get: (_, prop: string) => {
    const key = `llm-settings:labels.types.${prop}`;
    return i18n.exists(key) ? t(key) : prop;
  },
  ownKeys: () => [...TYPE_KEYS],
  getOwnPropertyDescriptor: (_, prop: string) => ({
    value: TYPE_LABELS[prop],
    enumerable: true,
    configurable: true,
  }),
});

const PROVIDER_NAMES: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  huggingface: "HuggingFace",
  siliconflow: "SiliconFlow",
  runware: "Runware",
  falai: "fal.ai",
};

const CATEGORY_KEYS = [
  "all",
  "recommended",
  "groq",
  "openrouter",
  "opencode",
  "huggingface",
  "siliconflow",
  "runware",
  "falai",
  "texto",
  "codigo",
  "razonamiento",
  "multimodal",
  "imagen",
  "video",
  "embedding",
  "audio",
  "moderacion",
] as const;

export const CATEGORY_LABELS: Record<string, string> = new Proxy({}, {
  get: (_, prop: string) => {
    if (prop in PROVIDER_NAMES) return PROVIDER_NAMES[prop];
    const key = `llm-settings:labels.categories.${prop}`;
    return i18n.exists(key) ? t(key) : prop;
  },
  ownKeys: () => [...CATEGORY_KEYS],
  getOwnPropertyDescriptor: (_, prop: string) => ({
    value: CATEGORY_LABELS[prop],
    enumerable: true,
    configurable: true,
  }),
});
