import { useState } from "react";

import { PlatformKeyActions } from "./platform-key-actions";
import { PlatformKeyDeleteConfirm } from "./platform-key-delete-confirm";
import { PlatformKeyInput } from "./platform-key-input";
import { providerMeta } from "./platform-key-meta";
import { PlatformKeyRowHeader } from "./platform-key-row-header";
import { usePlatformKeyDraft } from "./use-platform-key-draft";

interface PlatformKeyRowProps {
  provider: string;
  maskedValue?: string | null;
}

export function PlatformKeyRow({ provider, maskedValue }: Readonly<PlatformKeyRowProps>) {
  const masked = maskedValue ?? "";
  const configured = masked !== "";
  const meta = providerMeta(provider);
  const { inputRef, draft, setDraft, editing, trimmed, save, persist } = usePlatformKeyDraft(provider);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (trimmed !== "") persist(trimmed);
  };
  const actions = {
    configured,
    saving: save.isPending,
    canSave: trimmed !== "",
    label: meta.label,
    onSave: handleSave,
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
    <li className="space-y-3 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PlatformKeyRowHeader meta={meta} configured={configured} />
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
            onChange={setDraft}
            onSubmit={handleSave}
          />
          <PlatformKeyActions editing {...actions} />
        </div>
      )}
      {save.error && (
        <p role="alert" className="text-xs text-destructive">
          {save.error.message}
        </p>
      )}
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
