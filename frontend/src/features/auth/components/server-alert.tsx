import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/core/components/ui/alert";

interface ServerAlertProps {
  children: ReactNode;
  tone?: "error" | "success" | "info";
}

const TONE_CLASS = {
  error: "",
  success:
    "border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200",
  info: "",
} as const;

export function ServerAlert({ children, tone = "error" }: Readonly<ServerAlertProps>) {
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"} className={TONE_CLASS[tone]}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
