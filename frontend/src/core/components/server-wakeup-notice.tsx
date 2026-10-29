import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { getServerWakeupSnapshot, subscribeServerWakeup } from "@/core/lib/server-wakeup";

/** Aviso no bloqueante mientras el backend (plan free) despierta de la inactividad. */
export function ServerWakeupNotice() {
  const { t } = useTranslation();
  const waking = useSyncExternalStore(subscribeServerWakeup, getServerWakeupSnapshot);
  if (!waking) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      <p className="rounded-lg border bg-card px-4 py-2 text-sm text-foreground shadow-lg">
        {t("shell:despertando_servidor")}
      </p>
    </div>
  );
}
