import { apiJson } from "@/core/lib/http";

import type { ThemeState } from "../components/modals/theme-types";

/** Guarda la configuración de tema del usuario autenticado en el backend. */
export async function saveTheme(theme: ThemeState): Promise<void> {
  await apiJson("/api/users/me/theme", {
    method: "PATCH",
    body: JSON.stringify(theme),
  });
}

export const themeSettingsService = {
  saveTheme,
};
