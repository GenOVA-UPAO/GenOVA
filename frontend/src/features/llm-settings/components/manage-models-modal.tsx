import { useState } from "react";

import { Dialog, DialogContent } from "@/core/components/ui/dialog";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { groupModels, sortModels } from "../lib/catalog-sort";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { ConnectProviderModal } from "./connect-provider-modal";
import { ManageModelsBody } from "./manage-models-body";
import { ManageModelsHeader } from "./manage-models-header";
import { ManageModelsToolbar } from "./manage-models-toolbar";

interface ManageModelsModalProps {
  open: boolean;
  onClose: () => void;
  onGoToApiKeys: (provider?: string) => void;
}

export function ManageModelsModal({
  open,
  onClose,
  onGoToApiKeys,
}: Readonly<ManageModelsModalProps>) {
  const store = useLlmSettings();
  const [connectOpen, setConnectOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const grouped = groupModels(
    sortModels(store.catalogFull, store.sortKey),
    store.groupBy,
    PROVIDER_LABELS,
    store.sortKey !== "default",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90dvh] w-[min(920px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[920px]"
        onOpenAutoFocus={focusSearch}
      >
        <ManageModelsHeader
          onConnect={() => {
            setConnectOpen(true);
          }}
        />
        <ManageModelsToolbar
          localSearch={localSearch}
          categoryFilter={store.categoryFilter}
          categories={store.categories}
          typeFilter={store.typeFilter}
          types={store.types}
          sortKey={store.sortKey}
          groupBy={store.groupBy}
          onSearch={(value) => {
            setLocalSearch(value);
            store.handleSearch(value);
          }}
          onCategory={store.handleCategory}
          onType={store.handleType}
          onSort={store.handleSort}
          onGroup={store.handleGroup}
        />
        <ManageModelsBody
          hasKey={store.hasOwnLlmKey}
          loading={store.loading}
          groupedEmpty={grouped.length === 0}
          grouped={grouped}
          onAddKey={() => {
            onGoToApiKeys();
          }}
          onClear={() => {
            setLocalSearch("");
            store.handleSearch("");
            store.handleCategory("all");
            store.handleType("all");
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

/** Se abre para buscar: el foco va al buscador, no a «Conectar proveedor». */
function focusSearch(event: Event) {
  event.preventDefault();
  (event.currentTarget as HTMLElement)
    .querySelector<HTMLInputElement>("input[type=search]")
    ?.focus();
}
