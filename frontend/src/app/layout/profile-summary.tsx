import type { MeUser } from "@/core/auth/auth.service";
import { firstNonBlank } from "@/core/lib/text";

function roleLabel(user: MeUser | null): string {
  if (user?.role === "administrador") return "Admin";
  return firstNonBlank(user?.role) ?? "Usuario";
}

export function ProfileSummary({ user, name }: Readonly<{ user: MeUser | null; name: string }>) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="truncate text-sm font-medium">{name}</p>
        <span className="shrink-0 rounded-full bg-accent-brand/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-accent-brand uppercase">
          {roleLabel(user)}
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">{user?.email ?? "sesión activa"}</p>
    </div>
  );
}
