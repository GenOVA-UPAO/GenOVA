import { useTranslation } from "react-i18next";
/** Estado sin comprobar: solo se sabe si hay clave guardada (o en el servidor). */
export function PlatformKeyState({
  configured,
  serverKey,
}: Readonly<{ configured: boolean; serverKey: boolean }>) {
  const { t } = useTranslation();
  if (configured || serverKey) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
        {t("shared:keyUnchecked")}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{t("shared:sin_conectar")}</span>;
}
