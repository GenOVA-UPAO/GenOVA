export interface NavLinkItem {
  to: string;
  label: string;
  icon: "house" | "folder" | "plus";
}

export const navigationLinks: NavLinkItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "house" },
  { to: "/mis-ovas", label: "Mis OVAs", icon: "folder" },
  { to: "/crear", label: "Crear OVA", icon: "plus" },
];

export const adminNavLinks = [
  { to: "/admin/roles", label: "Roles", icon: "shield" as const },
  // exact: /admin is a prefix of /admin/roles — without it both stay active
  { to: "/admin", label: "Usuarios", icon: "users" as const, exact: true },
];

export const configNavLinks = [{ to: "/models", label: "Modelos", icon: "gear" as const }];
