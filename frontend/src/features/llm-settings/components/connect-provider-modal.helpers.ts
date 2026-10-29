import i18n from "i18next";

export interface ProviderOption {
  id: string;
  label: string;
  desc: string;
  /** Nombre del icono en el registro de core (`<Icon name>`). */
  iconName: string;
  badge?: string;
  badgeColor?: string;
}

export function getProviders(): ProviderOption[] {
  return [
    {
      id: "groq",
      label: "Groq",
      desc: i18n.t("llm-settings:credentials.connectModal.groqPitch"),
      badge: i18n.t("llm-settings:credentials.connectModal.badgeFree"),
      badgeColor: "bg-success/12 text-success-strong",
      iconName: "lightning",
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      desc: i18n.t("llm-settings:credentials.connectModal.openRouterPitch"),
      badge: i18n.t("llm-settings:credentials.connectModal.badgeRecommended"),
      badgeColor: "bg-primary/10 text-primary",
      iconName: "graph",
    },
    {
      id: "opencode",
      label: "OpenCode",
      desc: i18n.t("llm-settings:credentials.connectModal.openCodePitch"),
      iconName: "code",
    },
  ];
}

export const PROVIDERS = new Proxy([] as ProviderOption[], {
  get(_target, prop) {
    const list = getProviders();
    const val = (list as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(list) : val;
  },
});

