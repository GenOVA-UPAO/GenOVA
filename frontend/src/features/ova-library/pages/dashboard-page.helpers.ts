export interface AdminCard {
  to: string;
  icon: string;
  title: string;
  desc: string;
}

export const ADMIN_CARDS: AdminCard[] = [
  {
    to: "/admin/roles",
    icon: "shield-check",
    title: "Roles",
    desc: "Qué puede hacer cada perfil",
  },
  {
    to: "/admin/users",
    icon: "users",
    title: "Usuarios",
    desc: "Cuentas, estado y rol de cada persona",
  },
];

export function getUserFirstName(fullName?: string): string {
  if (!fullName) return "Usuario";
  return fullName.split(" ")[0] ?? "Usuario";
}
