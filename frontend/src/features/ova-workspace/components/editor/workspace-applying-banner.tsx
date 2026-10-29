import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

import { useAdoptedRegen } from "../../hooks/use-adopted-regen";
import { CancelRegenButton } from "./cancel-regen-button";
import { ChatProgressBar } from "./chat-progress-bar";

/** Aviso sobre el editor mientras una regeneración empezada antes sigue en marcha. */
export function WorkspaceApplyingBanner({ ovaId }: Readonly<{ ovaId: string }>) {
  const { t } = useTranslation();
  const regen = useAdoptedRegen(ovaId, true);
  return (
    <div role="status" className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-card px-4 py-2 text-sm">
      <Icon name="spinner" className="size-4 shrink-0 animate-spin text-primary" />
      <span className="font-medium text-foreground">{t("workspace:applyingChanges")}</span>
      <span className="text-muted-foreground">{t("workspace:applyingChangesHint")}</span>
      <ChatProgressBar percentage={regen.percentage} className="min-w-32 sm:max-w-56" />
      <CancelRegenButton cancel={{ canCancel: Boolean(regen.jobId), cancelling: regen.cancelling, run: regen.cancel }} />
    </div>
  );
}
