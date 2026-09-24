import { useIsAdmin } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { PROVIDERS } from "./connect-provider-modal.helpers";

interface ConnectProviderModalProps {
  open: boolean;
  onClose: () => void;
  onSelectProvider: (id: string) => void;
}

export function ConnectProviderModal({
  open,
  onClose,
  onSelectProvider,
}: Readonly<ConnectProviderModalProps>) {
  // El admin conecta proveedores para toda la plataforma; un usuario, con su cuenta.
  const isAdmin = useIsAdmin();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar proveedor</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Elige el proveedor y añade su clave de la plataforma en Credenciales. Al guardarla se comprueba y sus modelos quedan disponibles para todos."
              : "Elige el proveedor y añade tu clave en Credenciales. Al guardarla se comprueba y sus modelos se pagan con tu cuenta."}
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {PROVIDERS.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectProvider(provider.id);
                }}
                className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base text-muted-foreground group-hover:text-primary">
                  <Icon name={provider.iconName} size="text-base" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{provider.label}</span>
                    {provider.badge ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${provider.badgeColor ?? ""}`}
                      >
                        {provider.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{provider.desc}</span>
                </span>
                <Icon
                  name="caret-right"
                  size="text-sm"
                  className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary"
                />
              </button>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Icon name="info" size="text-sm" className="mt-px shrink-0" />
          Para usar modelos de Anthropic, OpenAI, Google, Mistral y otros, conecta OpenRouter:
          una sola clave da acceso a todos.
        </p>
      </DialogContent>
    </Dialog>
  );
}
