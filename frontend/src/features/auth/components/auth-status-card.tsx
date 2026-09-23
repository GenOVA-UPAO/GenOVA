import type { ReactNode } from "react";

interface AuthStatusCardProps {
  children: ReactNode;
  title?: string;
}

export function AuthStatusCard({ children, title }: Readonly<AuthStatusCardProps>) {
  return (
    <section className="flex h-dvh items-center justify-center overflow-y-auto bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center sm:p-8">
        <p className="mb-6 font-display text-xl font-semibold tracking-tight">
          Gen<span className="text-primary">OVA</span>
        </p>
        {title ? <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1> : null}
        {children}
      </div>
    </section>
  );
}
