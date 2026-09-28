import { CopyField } from "./copy-field";
import { TotpQr } from "./totp-qr";

interface TotpEnrollmentProps {
  uri: string;
  secret: string;
}

/** Cómo añadir GenOVA a la app: escanear el QR o, si no se puede, la clave a mano. */
export function TotpEnrollment({ uri, secret }: Readonly<TotpEnrollmentProps>) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <TotpQr uri={uri} />
      <div className="min-w-0 flex-1 space-y-3">
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Escanea el código con tu app (Google Authenticator, Authy, Microsoft Authenticator…).
          </li>
          <li>Escribe abajo el código de 6 dígitos que aparece en la app.</li>
        </ol>
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">
            ¿No puedes escanearlo? Añade la cuenta a mano con esta clave:
          </p>
          <CopyField label="Clave secreta" value={secret} ariaLabel="Copiar clave" mono />
          <details className="text-xs">
            <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
              Ver la URI de aprovisionamiento
            </summary>
            <div className="pt-3">
              <CopyField label="URI de aprovisionamiento" value={uri} ariaLabel="Copiar URI" />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
