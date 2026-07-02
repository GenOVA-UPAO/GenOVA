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
  { to: "/admin", label: "Usuarios", icon: "users" as const },
];

export const configNavLinks = [{ to: "/models", label: "Modelos", icon: "gear" as const }];
