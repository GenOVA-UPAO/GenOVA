import i18n from "i18next";
/** Clave compartida; se resuelve al leer el metadato, nunca al importar. */
const PASTE_HINT_KEY = "shared:pega_aqui_la_clave";

/** Qué puede generar GenOVA con la clave de cada proveedor. */
export type ProviderCoverage = "texto" | "imagen" | "video";

export interface ProviderMeta {
  label: string;
  placeholder: string;
  desc: string;
  compat: boolean;
  covers: ProviderCoverage[];
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  openrouter: {
    label: "OpenRouter",
    placeholder: "sk-or-…",
    get desc() { return i18n.t("shared:platformKey.openrouterDescription"); },
    compat: true,
    covers: ["texto", "imagen", "video"],
  },
  groq: {
    get label() { return i18n.t("shared:groq"); },
    placeholder: "gsk_…",
    get desc() { return i18n.t("shared:modelos_de_texto_abiertos_con_respuestas_muy_rapidas"); },
    compat: true,
    covers: ["texto"],
  },
  opencode: {
    label: "OpenCode Go",
    placeholder: "oc_…",
    get desc() { return i18n.t("shared:modelos_especializados_en_codigo"); },
    compat: true,
    covers: ["texto"],
  },
  huggingface: {
    label: "HuggingFace",
    placeholder: "hf_…",
    get desc() { return i18n.t("shared:modelos_abiertos_alojados_en_huggingface"); },
    compat: true,
    covers: ["texto"],
  },
  siliconflow: {
    label: "SiliconFlow",
    placeholder: "sk-…",
    get desc() { return i18n.t("shared:modelos_abiertos_de_bajo_costo"); },
    compat: true,
    covers: ["texto", "imagen"],
  },
  runware: {
    get label() { return i18n.t("shared:runware"); },
    get placeholder() { return i18n.t(PASTE_HINT_KEY); },
    get desc() { return i18n.t("shared:generacion_de_imagenes_stable_diffusion_xl"); },
    compat: false,
    covers: ["imagen"],
  },
  falai: {
    label: "fal.ai",
    get placeholder() { return i18n.t(PASTE_HINT_KEY); },
    get desc() { return i18n.t("shared:generacion_de_imagenes_en_la_nube"); },
    compat: false,
    covers: ["imagen"],
  },
  cloudflare: {
    get label() { return i18n.t("shared:cloudflare_workers_ai"); },
    get placeholder() { return i18n.t(PASTE_HINT_KEY); },
    get desc() { return i18n.t("shared:platformKey.cloudflareDescription"); },
    compat: false,
    covers: ["imagen"],
  },
};

/** El proveedor que se recomienda conectar primero: cubre texto, imagen y video. */
export const RECOMMENDED_PROVIDER = "openrouter";

/** Compatibilidad con consumidores externos al área: binding vivo al cambiar idioma. */
export let RECOMMENDED_HINT = i18n.t("shared:platformKey.openrouterHint");
i18n.on("languageChanged", () => {
  RECOMMENDED_HINT = i18n.t("shared:platformKey.openrouterHint");
});


export interface ProviderGroups {
  recommended: string[];
  text: string[];
  image: string[];
}

/**
 * Reparte los proveedores para las listas de claves: el recomendado arriba, y
 * el resto según lo principal que aportan (texto, o solo imagen y video).
 */
export function groupProviders(providers: readonly string[]): ProviderGroups {
  const rest = providers.filter((p) => p !== RECOMMENDED_PROVIDER);
  return {
    recommended: providers.filter((p) => p === RECOMMENDED_PROVIDER),
    text: rest.filter((p) => providerMeta(p).covers.includes("texto")),
    image: rest.filter((p) => !providerMeta(p).covers.includes("texto")),
  };
}

/** Metadatos del proveedor, con un genérico para proveedores que el front aún no conoce. */
export function providerMeta(provider: string): ProviderMeta {
  if (Object.hasOwn(PROVIDER_META, provider)) return PROVIDER_META[provider];
  return {
    label: provider,
    placeholder: i18n.t(PASTE_HINT_KEY),
    desc: i18n.t("shared:proveedor_generico"),
    compat: false,
    covers: [],
  };
}
