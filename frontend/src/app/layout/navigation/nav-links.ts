import i18n from "i18next";
export interface NavLinkItem {
  to: string;
  label: string;
  icon: "house" | "folder" | "plus";
}

export const navigationLinks: NavLinkItem[] = [
  { to: "/dashboard", get label() { return i18n.t("shell:dashboard"); }, icon: "house" },
  { to: "/mis-ovas", get label() { return i18n.t("shell:mis_ovas"); }, icon: "folder" },
  { to: "/crear", get label() { return i18n.t("shell:crear_ova"); }, icon: "plus" },
];

export const adminNavLinks = [
  { to: "/admin/roles", get label() { return i18n.t("shell:roles"); }, icon: "shield" as const },
  // exact: /admin is a prefix of /admin/roles — without it both stay active
  { to: "/admin", get label() { return i18n.t("shell:usuarios"); }, icon: "users" as const, exact: true },
];

export const configNavLinks = [{ to: "/models", get label() { return i18n.t("shell:modelos"); }, icon: "gear" as const }];
