import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

interface ProfileSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** `danger` marca la zona de acciones irreversibles. */
  tone?: "default" | "danger";
}

/** Panel de una sección del perfil: título, descripción y contenido. */
export function ProfileSection({
  title,
  description,
  children,
  className,
  tone = "default",
}: Readonly<ProfileSectionProps>) {
  return (
    <section
      className={cn(
        "space-y-5 rounded-xl border bg-card p-5 sm:p-6",
        tone === "danger" ? "border-destructive/30" : "border-border",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className={cn("text-base font-semibold", tone === "danger" && "text-destructive")}>
          {title}
        </h2>
        {description !== undefined && (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
