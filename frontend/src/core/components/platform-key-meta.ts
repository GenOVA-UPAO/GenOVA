/** Proveedores sin prefijo de clave reconocible. */
const PASTE_HINT = "Pega aquí la clave";

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
    desc: "Casi todos los modelos con una sola clave: el proveedor principal de la plataforma",
    compat: true,
    covers: ["texto", "imagen", "video"],
  },
  groq: {
    label: "Groq",
    placeholder: "gsk_…",
    desc: "Modelos de texto abiertos con respuestas muy rápidas",
    compat: true,
    covers: ["texto"],
  },
  opencode: {
    label: "OpenCode Go",
    placeholder: "oc_…",
    desc: "Modelos especializados en código",
    compat: true,
    covers: ["texto"],
  },
  huggingface: {
    label: "HuggingFace",
    placeholder: "hf_…",
    desc: "Modelos abiertos alojados en HuggingFace",
    compat: true,
    covers: ["texto"],
  },
  siliconflow: {
    label: "SiliconFlow",
    placeholder: "sk-…",
    desc: "Modelos abiertos de bajo costo",
    compat: true,
    covers: ["texto", "imagen"],
  },
  runware: {
    label: "Runware",
    placeholder: PASTE_HINT,
    desc: "Generación de imágenes (Stable Diffusion XL)",
    compat: false,
    covers: ["imagen"],
  },
  falai: {
    label: "fal.ai",
    placeholder: PASTE_HINT,
    desc: "Generación de imágenes en la nube",
    compat: false,
    covers: ["imagen"],
  },
  cloudflare: {
    label: "Cloudflare Workers AI",
    placeholder: PASTE_HINT,
    desc: "Generación de imágenes con el plan gratuito de Cloudflare",
    compat: false,
    covers: ["imagen"],
  },
};

/** El proveedor que se recomienda conectar primero: cubre texto, imagen y video. */
export const RECOMMENDED_PROVIDER = "openrouter";

export const RECOMMENDED_HINT =
  "Con una sola clave de OpenRouter tienes casi todos los modelos de texto, imagen y video.";

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
    placeholder: PASTE_HINT,
    desc: "Proveedor genérico",
    compat: false,
    covers: [],
  };
}
