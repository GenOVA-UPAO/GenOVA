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
  light: "Tema: claro",
  dark: "Tema: oscuro",
  system: "Tema: sistema",
};

interface UserMenuProps {
  onOpenAppearance: () => void;
}

export function UserMenu({ onOpenAppearance }: Readonly<UserMenuProps>) {
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
        aria-label={`Menú de usuario, ${initials}`}
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">
            {firstNonBlank(user?.full_name) ?? "Usuario GenOVA"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {firstNonBlank(user?.email) ?? "sesión activa"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <Icon name="user-circle" size="text-base" /> Mi perfil
          </Link>
        </DropdownMenuItem>
        {hasPermission(user, "view_analytics") && (
          <DropdownMenuItem asChild>
            <Link to="/analytics">
              <Icon name="chart-bar" size="text-base" /> Analítica
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onOpenAppearance}>
          <Icon name="palette" size="text-base" /> Apariencia
        </DropdownMenuItem>
        <DropdownMenuItem
          // Keep the menu open so the user can cycle several times.
          onSelect={(e) => {
            e.preventDefault();
            cycleTheme();
          }}
        >
          <Icon name={THEME_ICON[mode]} size="text-base" /> {THEME_LABEL[mode]}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <Icon name="sign-out" size="text-base" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
