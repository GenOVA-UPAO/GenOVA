import type { ReactNode } from "react";

interface AuthStatusCardProps {
  children: ReactNode;
  title?: string;
}

export function AuthStatusCard({ children, title }: Readonly<AuthStatusCardProps>) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        {title ? <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1> : null}
        {children}
      </div>
    </section>
  );
}
