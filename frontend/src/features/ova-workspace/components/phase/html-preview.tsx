import { useState } from "react";
import { useTranslation } from "react-i18next";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { PreviewResult } from "../../lib/ova-types";
import { resourceDisplayName } from "../../lib/resource-display-name";
import { SegmentedTabs } from "../shared/segmented-tabs";
import { HtmlCodeView } from "./html-code-view";

interface Props {
  result?: PreviewResult;
}

function downloadHtml(result: PreviewResult): void {
  if (!result.html_content) return;
  // charset explícito: sin utf-8 los acentos del contenido salen corruptos.
  const blob = new Blob([result.html_content], { type: "text/html;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `engage-${result.resource_type ?? ""}-${(result.concepto ?? "").replace(/\s+/g, "_")}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function HtmlPreview({ result }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<"preview" | "code">("preview");
  if (!result?.html_content) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {resourceDisplayName(result.tipo ?? "")}:{" "}
            <span className="text-primary">{result.concepto}</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="clock-counter-clockwise" size="text-xs" /> {result.duracion}{t("workspace:interactividad_290")}{" "}
            {(result.interactividad ?? "").toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedTabs
            label={t("workspace:vista_del_recurso")}
            value={view}
            onChange={setView}
            options={[
              { value: "preview", label: t("workspace:vista_previa") },
              { value: "code", label: t("workspace:codigo") },
            ]}
          />
          <Button
            onClick={() => {
              downloadHtml(result);
            }}
          >
            {t("workspace:descargar_html")} </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <HtmlPreviewFrame
          html={result.html_content}
          className={`block h-[60vh] max-h-[640px] min-h-[240px] w-full border-0 ${view === "code" ? "hidden" : ""}`}
          height={null}
        />
        {view === "code" && <HtmlCodeView content={result.html_content} />}
      </div>
    </div>
  );
}
