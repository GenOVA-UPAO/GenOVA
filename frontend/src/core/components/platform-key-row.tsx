import { useState } from "react";

import { PlatformKeyActions } from "./platform-key-actions";
import { PlatformKeyDeleteConfirm } from "./platform-key-delete-confirm";
import { PlatformKeyInput } from "./platform-key-input";
import { providerMeta } from "./platform-key-meta";
import { PlatformKeyRowHeader } from "./platform-key-row-header";
import { PlatformKeyRowMessages } from "./platform-key-row-messages";
import { checkPlatformProvider, useProviderCheck } from "./platform-provider-check";
import { ProviderCheckStatus } from "./platform-provider-check-status";
import { usePlatformKeyDraft } from "./use-platform-key-draft";

interface PlatformKeyRowProps {
  provider: string;
  maskedValue?: string | null;
  /** Hay clave en una variable de entorno del servidor (se usa si no se guarda otra). */
  serverKey?: boolean;
}

export function PlatformKeyRow({
  provider,
  maskedValue,
  serverKey = false,
}: Readonly<PlatformKeyRowProps>) {
  const masked = maskedValue ?? "";
  const configured = masked !== "";
  const meta = providerMeta(provider);
  const check = useProviderCheck(checkPlatformProvider);
  // Al guardar una clave se comprueba al momento con el proveedor.
  const { inputRef, draft, setDraft, editing, missingKey, save, persist, saveDraft } =
    usePlatformKeyDraft(provider, () => {
      check.run(provider);
    });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorId = `platform-key-error-${provider}`;

  const actions = {
    configured,
    serverKey,
    saving: save.isPending,
    checking: check.checking,
    label: meta.label,
    onSave: saveDraft,
    ...rowHandlers({ provider, check, save, setDraft, setConfirmDelete }),
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5" data-platform-key-row={provider}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PlatformKeyRowHeader
          meta={meta}
          configured={configured}
          serverKey={serverKey}
          check={check}
        />
        {configured && !editing && <code className="text-xs text-muted-foreground">{masked}</code>}
        {!editing && <PlatformKeyActions editing={false} {...actions} />}
      </div>
      {editing && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <PlatformKeyInput
            label={`Nueva clave de ${meta.label}`}
            value={draft ?? ""}
            placeholder={meta.placeholder}
            ref={inputRef}
            invalid={missingKey}
            errorId={errorId}
            onChange={setDraft}
            onSubmit={saveDraft}
          />
          <PlatformKeyActions editing {...actions} />
        </div>
      )}
      <ProviderCheckStatus check={check} />
      <PlatformKeyRowMessages
        missingKey={missingKey}
        errorId={errorId}
        providerLabel={meta.label}
        saveError={save.error}
      />
      <PlatformKeyDeleteConfirm
        open={confirmDelete}
        providerLabel={meta.label}
        deleting={save.isPending}
        onConfirm={() => {
          persist("", () => {
            setConfirmDelete(false);
            check.reset();
          });
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      />
    </li>
  );
}

interface RowHandlerArgs {
  provider: string;
  check: ReturnType<typeof useProviderCheck>;
  save: ReturnType<typeof usePlatformKeyDraft>["save"];
  setDraft: (value: string | null) => void;
  setConfirmDelete: (open: boolean) => void;
}

function rowHandlers({ provider, check, save, setDraft, setConfirmDelete }: RowHandlerArgs) {
  return {
    onCheck: () => {
      check.run(provider);
    },
    onCancel: () => {
      setDraft(null);
    },
    onEdit: () => {
      save.reset();
      setDraft("");
    },
    onDelete: () => {
      setConfirmDelete(true);
    },
  };
}
