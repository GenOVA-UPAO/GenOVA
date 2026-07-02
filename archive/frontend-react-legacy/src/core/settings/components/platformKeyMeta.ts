// Metadata de proveedores de API keys de plataforma (label, placeholder, etc.).
export const PROVIDER_META: Record<
  string,
  { label: string; placeholder: string; desc: string; compat: boolean }
> = {
  groq: {
    label: 'Groq',
    placeholder: 'gsk_...',
    desc: 'LLM principal — Llama 3',
    compat: true,
  },
  openrouter: {
    label: 'OpenRouter',
    placeholder: 'sk-or-...',
    desc: 'Fallback LLM — múltiples modelos',
    compat: true,
  },
  opencode: {
    label: 'OpenCode Go',
    placeholder: 'oc_...',
    desc: 'Modelos especializados en código',
    compat: true,
  },
  siliconflow: {
    label: 'SiliconFlow',
    placeholder: 'sk-...',
    desc: 'LLM / imagen — modelos open source a bajo costo',
    compat: true,
  },
  runware: {
    label: 'Runware',
    placeholder: '...',
    desc: 'Generación de imágenes — Stable Diffusion XL',
    compat: false,
  },
  falai: {
    label: 'fal.ai',
    placeholder: '...',
    desc: 'Inferencia rápida — imagen, video y audio en la nube',
    compat: false,
  },
}
