import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("llm-settings");
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
        <DialogHeader className="pr-8">
          <DialogTitle>{t("credentials.connectModal.title")}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? t("credentials.connectModal.descAdmin")
              : t("credentials.connectModal.descUser")}
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
          {t("credentials.connectModal.tip")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
