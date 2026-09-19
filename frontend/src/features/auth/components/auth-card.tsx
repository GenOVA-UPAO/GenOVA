import type { ReactNode } from "react";

import { AUTH_EYEBROW } from "../lib/auth-copy";

interface AuthCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  eyebrow?: string;
}

export function AuthCard({
  title,
  children,
  subtitle,
  eyebrow = AUTH_EYEBROW,
}: Readonly<AuthCardProps>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <div className="w-full max-w-md rounded-2xl border border-border border-t-2 border-t-accent-brand bg-card p-7 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-brand">
          {eyebrow}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm font-medium text-muted-foreground">{subtitle}</p>
        ) : null}
        {children}
      </div>
    </main>
  );
}
