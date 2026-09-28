export interface ProviderOption {
  id: string;
  label: string;
  desc: string;
  /** Nombre del icono en el registro de core (`<Icon name>`). */
  iconName: string;
  badge?: string;
  badgeColor?: string;
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "groq",
    label: "Groq",
    desc: "Modelos LLaMA y Qwen gratuitos, sin costo por token.",
    badge: "Gratuito",
    badgeColor: "bg-success/12 text-success-strong",
    iconName: "lightning",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    desc: "Cientos de modelos con una sola clave: Claude, GPT, Gemini, DeepSeek y más.",
    badge: "Recomendado",
    badgeColor: "bg-primary/10 text-primary",
    iconName: "graph",
  },
  {
    id: "opencode",
    label: "OpenCode",
    desc: "Suscripción con modelos optimizados para generación de código.",
    iconName: "code",
  },
];
