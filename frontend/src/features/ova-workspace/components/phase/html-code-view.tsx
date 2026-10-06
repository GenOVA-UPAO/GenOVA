import { useTranslation } from "react-i18next";
/** Bloque de código HTML crudo de la vista "Código" de la vista previa. */
export function HtmlCodeView({ content }: Readonly<{ content: string }>) {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium">HTML</span>
        <span className="tabular-nums">{content.length.toLocaleString(i18n.resolvedLanguage ?? i18n.language)} {t("workspace:caracteres")}</span>
      </div>
      <pre className="max-h-[480px] overflow-auto bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
        <code>{content}</code>
      </pre>
    </div>
  );
}
