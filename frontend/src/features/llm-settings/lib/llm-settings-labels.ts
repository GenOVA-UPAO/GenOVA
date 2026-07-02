export const TASK_LABELS: Record<string, string> = {
  texto: "Texto",
  codigo: "Código / HTML interactivo",
  orquestador: "Orquestador",
  razonamiento: "Razonamiento",
};

export const TYPE_LABELS: Record<string, string> = {
  all: "Todos los tipos",
  texto: "Texto",
  codigo: "Código",
  razonamiento: "Razonamiento",
  multimodal: "Multimodal",
  imagen: "Imagen",
  embedding: "Embedding",
  audio: "Audio",
};

export const CATEGORY_LABELS: Record<string, string> = {
  all: "Todos",
  recommended: "Recomendados",
  groq: "Groq",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  huggingface: "HuggingFace",
  texto: "Texto",
  codigo: "Código",
  razonamiento: "Razonamiento",
  multimodal: "Multimodal",
  imagen: "Imagen",
  embedding: "Embedding",
  audio: "Audio",
};

export const TASK_VISUAL: Record<string, { icon: string; bar: string; tint: string }> = {
  texto: { icon: "Aa", bar: "bg-primary", tint: "bg-primary/[.04]" },
  codigo: { icon: "</>", bar: "bg-accent-brand", tint: "bg-accent-brand/[.04]" },
  orquestador: { icon: "🤖", bar: "bg-primary/60", tint: "bg-primary/[.04]" },
  razonamiento: { icon: "🧠", bar: "bg-accent-brand/60", tint: "bg-accent-brand/[.04]" },
};
