export interface ProviderOption {
  id: string;
  label: string;
  desc: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "groq",
    label: "Groq",
    desc: "Modelos LLaMA y Qwen gratuitos — sin costo por token.",
    badge: "Gratuito",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: "⚡",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    desc: "Acceso a +300 modelos: Claude, GPT-4o, Gemini, DeepSeek y más.",
    badge: "Recomendado",
    badgeColor: "bg-primary/10 text-primary",
    icon: "◎",
  },
  {
    id: "opencode",
    label: "OpenCode",
    desc: "Suscripción con modelos optimizados para generación de código.",
    icon: "◈",
  },
];
