import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

// Solo se descarga al activar la verificación en dos pasos.
const QRCodeSVG = lazy(async () => {
  const mod = await import("qrcode.react");
  return { default: mod.QRCodeSVG };
});

const SIZE = 176;

/**
 * Código QR de la URI de aprovisionamiento. Las apps autenticadoras se
 * configuran escaneándolo; antes solo había una URI para copiar, incómoda en
 * un móvil. Fondo blanco fijo: con tema oscuro un QR invertido no se lee.
 */
export function TotpQr({ uri }: Readonly<{ uri: string }>) {
  const { t } = useTranslation("profile");

  return (
    <div className="w-fit shrink-0 rounded-xl border border-border bg-white p-3">
      <Suspense
        fallback={
          <div
            className="animate-pulse rounded-md bg-muted"
            style={{ width: SIZE, height: SIZE }}
            role="status"
            aria-label={t("totp.qrGenerating")}
          />
        }
      >
        <QRCodeSVG
          value={uri}
          size={SIZE}
          level="M"
          marginSize={0}
          bgColor="#ffffff"
          fgColor="#0b1b3a"
          title={t("totp.qrTitle")}
        />
      </Suspense>
    </div>
  );
}
