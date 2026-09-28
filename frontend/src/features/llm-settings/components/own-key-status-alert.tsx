import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { providerLabel } from "../lib/catalog-status";
import { joinList } from "../lib/join-list";
import {
  failingOwnProviders,
  isKeyProblem,
  type OwnCatalogStatus,
  ownKeyErrorText,
} from "../lib/own-catalog-status";

interface OwnKeyStatusAlertProps {
  status: OwnCatalogStatus | null;
  refreshing: boolean;
  onRetry: () => void;
  /** Lleva a la fila de la clave del proveedor en Credenciales. */
  onFixKey: (provider: string) => void;
}

/**
 * Aviso cuando la lista de modelos pedida con una clave propia falló. Dice el
 * motivo por proveedor: con la clave rechazada, reintentar no sirve y se lleva
 * a cambiarla; con un fallo pasajero se ofrece reintentar.
 */
export function OwnKeyStatusAlert({
  status,
  refreshing,
  onRetry,
  onFixKey,
}: Readonly<OwnKeyStatusAlertProps>) {
  const failing = failingOwnProviders(status);
  if (failing.length === 0) return null;
  const codeOf = (provider: string) => status?.[provider]?.error ?? "error";
  const keyProblem = failing.find((provider) => isKeyProblem(codeOf(provider)));

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-accent-brand/25 bg-accent-brand/5 px-4 py-3 sm:flex-row sm:items-center"
    >
      <Icon name="warning" size="text-lg" className="hidden shrink-0 text-accent-brand sm:block" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          No pudimos obtener tus modelos de {joinList(failing.map(providerLabel))}
        </p>
        {failing.length === 1 ? (
          <p className="text-muted-foreground">{ownKeyErrorText(codeOf(failing[0]))}</p>
        ) : (
          <ul className="text-muted-foreground">
            {failing.map((provider) => (
              <li key={provider}>
                {providerLabel(provider)}: {ownKeyErrorText(codeOf(provider))}
              </li>
            ))}
          </ul>
        )}
      </div>
      {keyProblem ? (
        <Button
          variant="outline"
          className="shrink-0 max-sm:h-11"
          onClick={() => {
            onFixKey(keyProblem);
          }}
        >
          Revisar clave de {providerLabel(keyProblem)}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="shrink-0 max-sm:h-11"
          onClick={onRetry}
          loading={refreshing}
        >
          <Icon name="arrow-clockwise" size="text-sm" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
