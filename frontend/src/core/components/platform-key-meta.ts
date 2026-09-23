/** Proveedores sin prefijo de clave reconocible. */
const PASTE_HINT = "Pega aquí la clave";

export const PROVIDER_META: Record<
  string,
  { label: string; placeholder: string; desc: string; compat: boolean }
> = {
  groq: {
    label: "Groq",
    placeholder: "gsk_…",
    desc: "Modelos de texto principales de la plataforma",
    compat: true,
  },
  openrouter: {
    label: "OpenRouter",
    placeholder: "sk-or-…",
    desc: "Respaldo con múltiples modelos",
    compat: true,
  },
  opencode: {
    label: "OpenCode Go",
    placeholder: "oc_…",
    desc: "Modelos especializados en código",
    compat: true,
  },
  siliconflow: {
    label: "SiliconFlow",
    placeholder: "sk-…",
    desc: "Texto e imagen con modelos abiertos de bajo costo",
    compat: true,
  },
  runware: {
    label: "Runware",
    placeholder: PASTE_HINT,
    desc: "Generación de imágenes (Stable Diffusion XL)",
    compat: false,
  },
  falai: {
    label: "fal.ai",
    placeholder: PASTE_HINT,
    desc: "Imagen, video y audio en la nube",
    compat: false,
  },
};

export type ProviderMeta = (typeof PROVIDER_META)[string];

/** Metadatos del proveedor, con un genérico para proveedores que el front aún no conoce. */
export function providerMeta(provider: string): ProviderMeta {
  if (Object.hasOwn(PROVIDER_META, provider)) return PROVIDER_META[provider];
  return { label: provider, placeholder: PASTE_HINT, desc: "Proveedor genérico", compat: false };
}
