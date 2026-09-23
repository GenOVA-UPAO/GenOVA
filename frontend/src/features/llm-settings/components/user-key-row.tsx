import { useRef, useState } from "react";

import { providerMeta } from "@/core/components/platform-key-meta";
import { Input } from "@/core/components/ui/input";

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
  const meta = providerMeta(provider);
  const inputId = `user-key-${provider}`;
  const configured = Boolean(maskedValue);

  return (
    <li className="space-y-3 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <UserKeyRowHeader provider={provider} configured={configured} />
        {configured && !state.editing ? (
          <code className="text-xs text-muted-foreground">{maskedValue}</code>
        ) : null}
        {state.editing ? null : (
          <UserKeyRowActions
            editing={false}
            configured={configured}
            saving={state.saving}
            onStart={() => {
              state.start();
              window.setTimeout(() => inputRef.current?.focus(), 50);
            }}
            onCancel={state.cancel}
            onSave={() => undefined}
          />
        )}
      </div>
      {state.editing ? (
        <div className="space-y-2">
          <label htmlFor={inputId} className="text-xs text-muted-foreground">
            {keyHint(meta.label, meta.placeholder)}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              id={inputId}
              type="password"
              autoComplete="off"
              value={state.draft}
              aria-invalid={state.rowError ? true : undefined}
              onChange={(event) => {
                state.setDraft(event.target.value);
              }}
              className="flex-1 font-mono text-xs max-sm:h-11"
            />
            <UserKeyRowActions
              editing
              configured={configured}
              saving={state.saving}
              onStart={state.start}
              onCancel={state.cancel}
              onSave={() => {
                void state.persist(provider, save);
              }}
            />
          </div>
        </div>
      ) : null}
      {state.rowError ? (
        <p role="alert" className="text-xs text-destructive">
          {state.rowError}
        </p>
      ) : null}
    </li>
  );
}

function keyHint(label: string, placeholder: string): string {
  // Los placeholders con prefijo real acaban en «…» («gsk_…»); el resto es texto de ayuda.
  const prefix = placeholder.endsWith("…") ? placeholder.slice(0, -1).trim() : "";
  return prefix === "" ? `Clave API de ${label}` : `Clave API de ${label}. Empieza por ${prefix}`;
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
      if (draft.trim() === "") {
        setRowError("Pega la clave antes de guardar.");
        return;
      }
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
