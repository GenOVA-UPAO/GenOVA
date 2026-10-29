import { useTranslation } from "react-i18next";

import { CopyField } from "./copy-field";
import { TotpQr } from "./totp-qr";

interface TotpEnrollmentProps {
  uri: string;
  secret: string;
}

/** Cómo añadir GenOVA a la app: escanear el QR o, si no se puede, la clave a mano. */
export function TotpEnrollment({ uri, secret }: Readonly<TotpEnrollmentProps>) {
  const { t } = useTranslation("profile");

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <TotpQr uri={uri} />
      <div className="min-w-0 flex-1 space-y-3">
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>{t("totp.step1")}</li>
          <li>{t("totp.step2")}</li>
        </ol>
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{t("totp.manualHint")}</p>
          <CopyField
            label={t("totp.secretLabel")}
            value={secret}
            ariaLabel={t("totp.copyKey")}
            mono
          />
          <details className="text-xs">
            <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
              {t("totp.showUri")}
            </summary>
            <div className="pt-3">
              <CopyField
                label={t("totp.uriLabel")}
                value={uri}
                ariaLabel={t("totp.copyUri")}
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
