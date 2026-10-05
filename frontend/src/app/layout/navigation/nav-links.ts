export interface NavLinkItem {
  to: string;
  labelKey: string;
  icon: "house" | "folder" | "plus";
}

export const navigationLinks: NavLinkItem[] = [
  { to: "/dashboard", labelKey: "shell:dashboard", icon: "house" },
  { to: "/mis-ovas", labelKey: "shell:mis_ovas", icon: "folder" },
  { to: "/crear", labelKey: "shell:crear_ova", icon: "plus" },
];

export const adminNavLinks = [
  { to: "/admin/roles", labelKey: "shell:roles", icon: "shield" as const },
  { to: "/admin/lti", labelKey: "shell:lti", icon: "plugs-connected" as const },
  // exact: /admin is a prefix of /admin/roles — without it both stay active
  { to: "/admin", labelKey: "shell:usuarios", icon: "users" as const, exact: true },
];

export const configNavLinks = [{ to: "/models", labelKey: "shell:modelos", icon: "gear" as const }];
