import { useState } from "react";

import { PlatformKeyActions } from "./platform-key-actions";
import { PlatformKeyDeleteConfirm } from "./platform-key-delete-confirm";
import { PlatformKeyInput } from "./platform-key-input";
import { providerMeta } from "./platform-key-meta";
import { PlatformKeyRowHeader } from "./platform-key-row-header";
import { PlatformKeyRowMessages } from "./platform-key-row-messages";
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
  const { inputRef, draft, setDraft, editing, missingKey, save, persist, saveDraft } =
    usePlatformKeyDraft(provider);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const errorId = `platform-key-error-${provider}`;

  const actions = {
    configured,
    serverKey,
    saving: save.isPending,
    label: meta.label,
    onSave: saveDraft,
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

  return (
    <li className="space-y-3 px-4 py-3.5" data-platform-key-row={provider}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PlatformKeyRowHeader meta={meta} configured={configured} serverKey={serverKey} />
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
          });
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      />
    </li>
  );
}
