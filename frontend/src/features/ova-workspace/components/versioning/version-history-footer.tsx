import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { ModalActions } from "../shared/modal-actions";

function compareStatus(t: TFunction, count: number, compared: boolean): string {
  if (compared) return t("footer.compareDone");
  if (count === 2) return t("footer.compareTwo");
  return t("footer.compareHint", { count });
}

interface Props {
  canCompare: boolean;
  selectedCount: number;
  comparing: boolean;
  /** Ya se muestra la comparación de las dos marcadas: volver a pedirla no aporta nada. */
  compared: boolean;
  onCompare: () => void;
  onClose: () => void;
}

export function VersionHistoryFooter({
  canCompare,
  selectedCount,
  comparing,
  compared,
  onCompare,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation("workspace-versioning");
  return (
    <ModalActions status={canCompare && compareStatus(t, selectedCount, compared)}>
      <Button variant="outline" onClick={onClose}>
        {t("footer.close")}
      </Button>
      {canCompare && !compared && (
        <Button disabled={selectedCount !== 2} loading={comparing} onClick={onCompare}>
          {t("footer.compare")}
        </Button>
      )}
    </ModalActions>
  );
}
