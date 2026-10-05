import i18n from "i18next";
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
    get title() {
      return i18n.t("ova-library:roles");
    },
    get desc() {
      return i18n.t("ova-library:que_puede_hacer_cada_perfil");
    },
  },
  {
    to: "/admin/users",
    icon: "users",
    get title() {
      return i18n.t("ova-library:usuarios");
    },
    get desc() {
      return i18n.t("ova-library:cuentas_estado_y_rol_de_cada_persona");
    },
  },
];

export function getUserFirstName(fullName?: string): string {
  if (!fullName) return i18n.t("ova-library:usuario");
  return fullName.split(" ")[0] ?? i18n.t("ova-library:usuario");
}
