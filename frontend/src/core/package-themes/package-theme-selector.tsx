import { useId } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import { Label } from "@/core/components/ui/label";

import { usePackageThemes } from "./use-package-themes";

interface Props {
  value: string;
  onChange: (theme: string) => void;
  disabled?: boolean;
}

export function PackageThemeSelector({ value, onChange, disabled = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const id = useId();
  const catalog = usePackageThemes();
  const selected = catalog.data?.themes.find((theme) => theme.id === value);
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{t("package-themes:label")}</Label>
      <select
        id={id}
        value={value}
        disabled={disabled || !catalog.data}
        onChange={(event) => { onChange(event.target.value); }}
        aria-describedby={`${id}-help`}
        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {catalog.data?.themes.map((theme) => <option key={theme.id} value={theme.id}>{t(`package-themes:names.${theme.id}`, { defaultValue: theme.label })}</option>)}
        {!catalog.data && <option value={value}>{t("package-themes:loading")}</option>}
      </select>
      {selected && (
        <div
          aria-hidden="true"
          className="flex min-h-11 flex-wrap items-center gap-3 border p-3"
          style={{ background: selected.tokens.bg, color: selected.tokens.text, borderColor: selected.tokens.border, borderRadius: selected.tokens.radius, fontFamily: selected.tokens["font-body"] }}
        >
          <span className="font-semibold" style={{ color: selected.tokens.primary }}>{t("package-themes:previewTitle")}</span>
          <span className="size-5 rounded-full" style={{ background: selected.tokens.accent }} />
          <span className="rounded px-2 py-1 text-sm" style={{ background: selected.tokens.action, color: selected.tokens["on-action"] }}>{t("package-themes:continue")}</span>
        </div>
      )}
      <p id={`${id}-help`} className="text-sm text-muted-foreground">{t("package-themes:help")}</p>
      {catalog.isError && <div role="alert" className="text-sm text-destructive">{t("package-themes:loadError")} <Button type="button" variant="outline" onClick={() => { void catalog.refetch(); }}>{t("package-themes:retry")}</Button></div>}
    </div>
  );
}
