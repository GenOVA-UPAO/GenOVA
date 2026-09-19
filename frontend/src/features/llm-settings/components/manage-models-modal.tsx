import { useState } from "react";

import { useModalDismiss } from "@/core/hooks/use-modal-dismiss";

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

export function ManageModelsModal({ open, onClose, onGoToApiKeys }: Readonly<ManageModelsModalProps>) {
  const store = useLlmSettings();
  const [connectOpen, setConnectOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  useModalDismiss(onClose, open);

  const grouped = groupModels(
    sortModels(store.catalogFull, store.sortKey),
    store.groupBy,
    PROVIDER_LABELS,
    store.sortKey !== "default",
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        role="presentation"
        className="relative flex max-h-[90vh] w-[min(920px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <ManageModelsHeader
          onClose={onClose}
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
      </div>
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
    </div>
  );
}
