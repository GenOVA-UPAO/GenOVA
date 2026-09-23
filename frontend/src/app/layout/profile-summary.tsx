import type { MeUser } from "@/core/auth/auth.service";
import { firstNonBlank } from "@/core/lib/text";

/** Nombre legible del rol: «usuarios_prueba» → «Usuarios prueba». */
function roleLabel(user: MeUser | null): string {
  const role = firstNonBlank(user?.role) ?? "usuario";
  const text = role.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ProfileSummary({ user, name }: Readonly<{ user: MeUser | null; name: string }>) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium" title={name}>
        {name}
      </p>
      <p className="truncate text-xs text-muted-foreground">{roleLabel(user)}</p>
    </div>
  );
}
