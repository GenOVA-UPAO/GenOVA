import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

function copy(label: string, value: string): void {
  navigator.clipboard.writeText(value).then(
    () => toast.success(i18n.t("lti:copied", { label })),
    () => toast.error(i18n.t("lti:copyError")),
  );
}

export function ToolRow({
  label,
  hint,
  value,
}: Readonly<{ label: string; hint: string; value: string }>) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
        <dd className="mt-1 font-mono text-sm break-all">{value}</dd>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="max-md:h-11 sm:shrink-0"
        aria-label={t("lti:copyLabel", { label })}
        onClick={() => {
          copy(label, value);
        }}
      >
        <Icon name="copy" /> {t("lti:copy")}
      </Button>
    </div>
  );
}
