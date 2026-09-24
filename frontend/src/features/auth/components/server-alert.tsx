import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/core/components/ui/alert";

interface ServerAlertProps {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}

// Solo tokens del tema: el éxito usaba verdes de la paleta de Tailwind y el error
// no se distinguía del fondo de la tarjeta.
const TONE_CLASS = {
  error: "border-destructive/30 bg-destructive/10",
  success: "border-success/30 bg-success/10 text-success-strong",
  info: "",
} as const;

export function ServerAlert({ children, tone = "error" }: Readonly<ServerAlertProps>) {
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"} className={TONE_CLASS[tone]}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
