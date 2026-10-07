import { useTranslation } from "react-i18next";

import { ownKeyErrorLabel, type OwnKeyView } from "../lib/own-catalog-status";

/** Estado veraz de la clave: guardada no es lo mismo que aceptada por el proveedor. */
export function UserKeyState({ view }: Readonly<{ view: OwnKeyView }>) {
  const { t } = useTranslation("llm-settings");
  switch (view.kind) {
    case "none":
      return <span className="text-xs text-muted-foreground">{t("credentials.notConnected")}</span>;
    case "checking":
      return <span className="text-xs text-muted-foreground">{t("credentials.testing")}</span>;
    case "saved":
      return <span className="text-xs text-muted-foreground">{t("shared:keyUnchecked")}</span>;
    case "error":
      return (
        <span
          className={
            view.code === "invalid_key"
              ? "inline-flex items-center gap-1.5 text-xs text-destructive"
              : "inline-flex items-center gap-1.5 text-xs text-muted-foreground"
          }
        >
          <span
            aria-hidden="true"
            className={
              view.code === "invalid_key"
                ? "size-1.5 rounded-full bg-destructive"
                : "size-1.5 rounded-full bg-muted-foreground"
            }
          />
          {view.code === "unreachable" ? t("shared:keyUnchecked") : ownKeyErrorLabel(view.code)}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-success-strong">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
          {t("credentials.connected")}
          {view.models !== null ? (
            <span className="text-muted-foreground">· {t("credentials.modelsCount", { count: view.models })}</span>
          ) : null}
        </span>
      );
  }
}
