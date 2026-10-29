import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { authStore, useCurrentUser } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { queryClient } from "@/core/lib/query-client";
import { firstNonBlank } from "@/core/lib/text";
import { cycleTheme, type ThemeMode, useTheme } from "@/core/theme/theme";

import { hasPermission, userInitials } from "./lib/layout-helpers";

const THEME_ICON: Record<ThemeMode, string> = { light: "sun", dark: "moon", system: "monitor" };
const THEME_LABEL: Record<ThemeMode, string> = {
  light: "shell:modo_claro",
  dark: "shell:modo_oscuro",
  system: "shell:modo_del_sistema",
};

interface UserMenuProps {
  onOpenAppearance: () => void;
}

export function UserMenu({ onOpenAppearance }: Readonly<UserMenuProps>) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { mode } = useTheme();
  const navigate = useNavigate();
  const initials = userInitials(user);

  const logout = async () => {
    await authStore.logout();
    // No cached data from this account survives the session.
    queryClient.clear();
    await navigate("/login", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95"
        aria-label={t("shell:menu_de_usuario_value", { p0: initials })}
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">
            {firstNonBlank(user?.full_name) ?? t("shell:usuario_genova")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {firstNonBlank(user?.email) ?? t("shell:sesion_activa")}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <Icon name="user-circle" size="text-base" /> {t("shell:mi_perfil")} </Link>
        </DropdownMenuItem>
        {hasPermission(user, "view_analytics") && (
          <DropdownMenuItem asChild>
            <Link to="/analytics">
              <Icon name="chart-bar" size="text-base" /> {t("shell:analitica")} </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onOpenAppearance}>
          <Icon name="palette" size="text-base" /> {t("shell:estilo_de_mis_ovas")} </DropdownMenuItem>
        <DropdownMenuItem
          // Keep the menu open so the user can cycle several times.
          onSelect={(e) => {
            e.preventDefault();
            cycleTheme();
          }}
        >
          <Icon name={THEME_ICON[mode]} size="text-base" /> {t(THEME_LABEL[mode])}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <Icon name="sign-out" size="text-base" /> {t("shell:cerrar_sesion")} </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
