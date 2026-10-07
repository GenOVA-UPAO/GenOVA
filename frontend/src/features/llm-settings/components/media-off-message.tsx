import { useTranslation } from "react-i18next";

export function MediaOffMessage({ task }: Readonly<{ task: string }>) {
  const { t } = useTranslation("llm-settings");
  return (
    <p
      className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
      data-testid="media-gen-off"
    >
      {task === "video" ? t("mediaStatus.videoOffMsg") : t("mediaStatus.imageOffMsg")}
    </p>
  );
}

