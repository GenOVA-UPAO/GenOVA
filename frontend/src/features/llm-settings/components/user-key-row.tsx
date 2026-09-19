import { useRef, useState } from "react";

import { providerMeta } from "@/core/components/platform-key-meta";
import { cn } from "@/core/lib/cn";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";
import { UserKeyRowActions } from "./user-key-row-actions";
import { UserKeyRowHeader } from "./user-key-row-header";

interface UserKeyRowProps {
  provider: string;
  maskedValue?: string;
}

export function UserKeyRow({ provider, maskedValue }: Readonly<UserKeyRowProps>) {
  const { save } = useUserApiKeys();
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useKeyDraft();
  const placeholder = providerMeta(provider).placeholder;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm">
      <UserKeyRowHeader provider={provider} configured={Boolean(maskedValue)} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          type="password"
          value={state.editing ? state.draft : (maskedValue ?? "")}
          readOnly={!state.editing}
          placeholder={placeholder}
          onChange={(event) => {
            state.setDraft(event.target.value);
          }}
          className={cn(
            "flex-1 rounded-lg border border-border px-3 py-2 font-mono text-xs",
            state.editing ? "bg-background" : "bg-muted/30 text-muted-foreground",
          )}
        />
        <UserKeyRowActions
          editing={state.editing}
          configured={Boolean(maskedValue)}
          saving={state.saving}
          canSave={state.draft.trim().length > 0}
          onStart={() => {
            state.start();
            window.setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onCancel={state.cancel}
          onSave={() => {
            void state.persist(provider, save);
          }}
        />
      </div>
      {state.rowError ? <p className="text-xs text-destructive">{state.rowError}</p> : null}
    </div>
  );
}

function useKeyDraft() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  return {
    editing,
    draft,
    saving,
    rowError,
    setDraft,
    start: () => {
      setDraft("");
      setEditing(true);
      setRowError(null);
    },
    cancel: () => {
      setEditing(false);
      setDraft("");
    },
    persist: async (provider: string, save: ReturnType<typeof useUserApiKeys>["save"]) => {
      setSaving(true);
      setRowError(null);
      try {
        await save({ provider, key: draft.trim() });
        setEditing(false);
        setDraft("");
      } catch (err: unknown) {
        setRowError(errorMessage(err, "Error al guardar."));
      } finally {
        setSaving(false);
      }
    },
  };
}
