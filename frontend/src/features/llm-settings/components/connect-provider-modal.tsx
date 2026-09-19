import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { useModalDismiss } from "@/core/hooks/use-modal-dismiss";

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
  useModalDismiss(onClose, open);
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        role="presentation"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="border-b border-border/60 bg-muted/20 px-5 pt-5 pb-4">
          <h2 className="text-base font-bold text-foreground">Conectar proveedor</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Selecciona un proveedor para añadir tu API key.
          </p>
        </div>
        <div className="space-y-2.5 p-4">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => {
                onSelectProvider(provider.id);
              }}
              className="group flex w-full items-start gap-3.5 rounded-xl border border-border/50 px-4 py-3.5 text-left transition duration-150 hover:border-primary/40 hover:bg-primary/[.025]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-base font-bold text-muted-foreground transition group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-primary">
                {provider.iconName ? <Icon name={provider.iconName} size="text-base" /> : provider.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{provider.label}</span>
                  {provider.badge ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide uppercase ${provider.badgeColor ?? ""}`}
                    >
                      {provider.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{provider.desc}</p>
              </div>
              <span className="mt-1 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary">
                →
              </span>
            </button>
          ))}
        </div>
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2.5">
          <Icon name="info" size="text-xs" className="mt-0.5 shrink-0 text-muted-foreground/60" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Para acceder a modelos de
            <span className="font-semibold text-foreground"> Anthropic, OpenAI, Google, Mistral</span> y
            más — conecta
            <span className="font-semibold text-foreground"> OpenRouter</span> con tu cuenta.
          </p>
        </div>
        <div className="flex justify-end px-4 pb-4">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs text-muted-foreground">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
