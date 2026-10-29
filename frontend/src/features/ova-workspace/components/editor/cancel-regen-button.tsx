import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

export interface RegenCancel {
  canCancel: boolean;
  cancelling: boolean;
  run: () => void;
}

/** Cancela la regeneración en curso (lo ya editado se descarta; el OVA conserva su versión). */
export function CancelRegenButton({ cancel, className }: Readonly<{ cancel: RegenCancel; className?: string }>) {
  const { t } = useTranslation();
  if (!cancel.canCancel && !cancel.cancelling) return null;
  return (
    <Button variant="outline" size="xs" className={className} disabled={cancel.cancelling} onClick={cancel.run}>
      {cancel.cancelling ? t("workspace:regenCancelling") : t("workspace:regenCancel")}
    </Button>
  );
}
