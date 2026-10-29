import type { TFunction } from "i18next";
import i18n from "i18next";
export interface AdminCard {
  to: string;
  icon: string;
  titleKey: string;
  descKey: string;
}

export const ADMIN_CARDS: AdminCard[] = [
  {
    to: "/admin/roles",
    icon: "shield-check",
    titleKey: "ova-library:roles",
    descKey: "ova-library:que_puede_hacer_cada_perfil",
  },
  {
    to: "/admin/users",
    icon: "users",
    titleKey: "ova-library:usuarios",
    descKey: "ova-library:cuentas_estado_y_rol_de_cada_persona",
  },
];

export function getUserFirstName(fullName?: string, t: TFunction = i18n.t): string {
  if (!fullName) return t("ova-library:usuario");
  return fullName.split(" ")[0] ?? t("ova-library:usuario");
}
