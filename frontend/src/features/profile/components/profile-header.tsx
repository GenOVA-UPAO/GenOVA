import { cn } from "@/core/lib/cn";

import { formatDate, getInitials } from "../lib/profile-format";
import type { ProfileData } from "../lib/types";

interface ProfileHeaderProps {
  profile: ProfileData | null;
  role: string;
  isLoading: boolean;
}

export function ProfileHeader({ profile, role, isLoading }: Readonly<ProfileHeaderProps>) {
  const isAdmin = role === "administrador";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
      <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full bg-primary/[.04] blur-2xl" />
      <div className="pointer-events-none absolute right-24 bottom-0 size-28 rounded-full bg-accent-brand/[.04] blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-fit shrink-0 self-start sm:self-auto">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent-brand font-display text-xl font-bold text-primary-foreground shadow-md">
            {getInitials(profile?.full_name)}
          </div>
          <span
            className={cn(
              "absolute -right-1 -bottom-1 z-10 size-4 rounded-full border-2 border-card",
              isAdmin ? "bg-primary" : "bg-accent-brand",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          {isLoading ? (
            <div className="h-6 w-40 animate-pulse rounded-lg bg-muted/60" />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                {profile?.full_name ?? "Usuario"}
              </h1>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                  isAdmin
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-accent-brand/25 bg-accent-brand/10 text-accent-brand",
                )}
              >
                {role}
              </span>
            </div>
          )}
          <p className="text-sm font-medium text-muted-foreground">{profile?.email ?? "—"}</p>
          <p className="text-xs text-muted-foreground/60">
            Miembro desde {formatDate(profile?.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
