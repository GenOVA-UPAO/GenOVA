import { useState } from "react";

import { useIsAdmin } from "@/core/auth/auth-store";
import { Dialog, DialogContent } from "@/core/components/ui/dialog";

import { useCatalogBrowser } from "../hooks/use-catalog-browser";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { configUsage } from "../lib/model-usage";
import { taskMeta } from "../lib/task-meta";
import { userModelsInUse } from "../lib/user-favorites";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { ConnectProviderModal } from "./connect-provider-modal";
import { ManageModelsBody } from "./manage-models-body";
import { ManageModelsHeader } from "./manage-models-header";
import { ManageModelsToolbar } from "./manage-models-toolbar";

interface ManageModelsModalProps {
  open: boolean;
  onClose: () => void;
  onGoToApiKeys: (provider?: string) => void;
}

/**
 * Catálogo de modelos: para conocer lo que hay (precio, contexto, capacidades)
 * y marcar favoritos, que salen primero al elegir modelo en cada tarea.
 */
export function ManageModelsModal({ open, onClose, onGoToApiKeys }: Readonly<ManageModelsModalProps>) {
  const store = useLlmSettings();
  const isAdmin = useIsAdmin();
  const [connectOpen, setConnectOpen] = useState(false);
  const isFavorite = (model: CatalogModel) =>
    store.isModelEnabled(model.provider, model.model_id) || store.isDefaultModel(model.provider, model.model_id);
  const usage = inUseLabels(store.platform, store.settings, isAdmin);
  const browser = useCatalogBrowser(
    store.catalogFull,
    isFavorite,
    (model) => Object.hasOwn(usage, `${model.provider}::${model.model_id}`),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        browser.reset();
        onClose();
      }}
    >
      <DialogContent
        className="flex h-[min(52rem,calc(100dvh-2rem))] w-[min(960px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px] max-sm:h-[calc(100dvh-1rem)] max-sm:w-[calc(100vw-1rem)] max-sm:max-w-[calc(100vw-1rem)]"
        onOpenAutoFocus={focusSearch}
      >
        <ManageModelsHeader
          isAdmin={isAdmin}
          onConnect={() => {
            setConnectOpen(true);
          }}
        />
        <ManageModelsToolbar browser={browser} total={store.catalogFull.length} />
        <ManageModelsBody
          hasKey={isAdmin || store.hasOwnLlmKey}
          loading={store.loading}
          browser={browser}
          usage={usage}
          onAddKey={() => {
            onGoToApiKeys();
          }}
        />
      </DialogContent>
      <ConnectProviderModal
        open={connectOpen}
        onClose={() => {
          setConnectOpen(false);
        }}
        onSelectProvider={(provider) => {
          setConnectOpen(false);
          onGoToApiKeys(provider);
        }}
      />
    </Dialog>
  );
}

/** Dónde se usa cada modelo: en la plataforma y, para quien tiene clave, en sus tareas. */
function inUseLabels(
  platform: Parameters<typeof configUsage>[0],
  settings: Parameters<typeof userModelsInUse>[0],
  isAdmin: boolean,
): Record<string, string[]> {
  const usage = configUsage(platform);
  if (isAdmin) return usage;
  for (const model of userModelsInUse(settings)) {
    const key = `${model.provider}::${model.model_id}`;
    const label = `${taskMeta(model.task).label} (tuyo)`;
    usage[key] = [...(usage[key] ?? []), label];
  }
  return usage;
}

/** Se abre para buscar: el foco va al buscador, no a «Conectar proveedor». */
function focusSearch(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>("input[type=search]")?.focus();
}
