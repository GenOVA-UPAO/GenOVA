import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { type CatalogStatus, providerLabel, unconnectedProviders } from "../lib/catalog-status";
import { joinList } from "../lib/join-list";

interface UnconnectedProvidersNoteProps {
  catalogStatus: CatalogStatus | null;
  onConnect: (provider: string) => void;
}

/**
 * Proveedores sin clave de plataforma. No es un error (antes salían en el aviso
 * de fallo): se dice cuáles son y se ofrece conectarlos.
 */
export function UnconnectedProvidersNote({
  catalogStatus,
  onConnect,
}: Readonly<UnconnectedProvidersNoteProps>) {
  const pending = unconnectedProviders(catalogStatus);
  if (pending.length === 0) return null;
  const first = pending[0];
  const names = joinList(pending.map(providerLabel));
  const single = pending.length === 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
      <Icon name="link" size="text-lg" className="hidden shrink-0 text-muted-foreground sm:block" />
      <p className="min-w-0 flex-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Sin conectar: {names}.</span>{" "}
        {single
          ? "Añade su clave de plataforma para usar sus modelos."
          : "Añade sus claves de plataforma para usar sus modelos."}
      </p>
      <Button
        variant="outline"
        className="shrink-0 max-sm:h-11"
        onClick={() => {
          onConnect(first);
        }}
      >
        {single ? `Conectar ${providerLabel(first)}` : "Conectar proveedores"}
      </Button>
    </div>
  );
}
