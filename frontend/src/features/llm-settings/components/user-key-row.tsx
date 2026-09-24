import { useRef, useState } from "react";

import { providerMeta } from "@/core/components/platform-key-meta";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";
import { UserKeyInput } from "./user-key-input";
import { UserKeyRemove } from "./user-key-remove";
import { UserKeyRowActions } from "./user-key-row-actions";
import { UserKeyRowHeader } from "./user-key-row-header";

interface UserKeyRowProps {
  provider: string;
  maskedValue?: string;
}

export function UserKeyRow({ provider, maskedValue }: Readonly<UserKeyRowProps>) {
  const { save } = useUserApiKeys();
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  // Al cerrar el campo, el foco volvía a <body>: se devuelve al botón de la fila.
  // Con timeout y no en el mismo frame: al quitar la clave, el diálogo de
  // confirmación devuelve antes el foco a su botón (que ya no existe).
  const focusStart = () => {
    window.setTimeout(() => startRef.current?.focus(), 50);
  };
  const state = useKeyDraft(focusStart);
  const meta = providerMeta(provider);
  const inputId = `user-key-${provider}`;
  const configured = Boolean(maskedValue);

  return (
    <li className="space-y-3 px-4 py-3.5" data-key-row={provider}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <UserKeyRowHeader provider={provider} configured={configured} />
        {configured && !state.editing ? (
          <code className="text-xs text-muted-foreground">{maskedValue}</code>
        ) : null}
        {state.editing ? null : (
          <UserKeyRowActions
            startRef={startRef}
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
        {configured && !state.editing ? (
          <UserKeyRemove provider={provider} label={meta.label} onRemoved={focusStart} />
        ) : null}
      </div>
      {state.editing ? (
        <UserKeyInput
          id={inputId}
          label={keyHint(meta.label, meta.placeholder)}
          inputRef={inputRef}
          value={state.draft}
          error={state.rowError}
          saving={state.saving}
          configured={configured}
          onChange={state.setDraft}
          onSave={() => {
            void state.persist(provider, save);
          }}
          onCancel={state.cancel}
        />
      ) : null}
    </li>
  );
}

const MIN_KEY_LENGTH = 8;

function keyHint(label: string, placeholder: string): string {
  // Los placeholders con prefijo real acaban en «…» («gsk_…»); el resto es texto de ayuda.
  const prefix = placeholder.endsWith("…") ? placeholder.slice(0, -1).trim() : "";
  return prefix === "" ? `Clave API de ${label}` : `Clave API de ${label}. Empieza por ${prefix}`;
}

function useKeyDraft(onClose: () => void) {
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
      setRowError(null);
      onClose();
    },
    persist: async (provider: string, save: ReturnType<typeof useUserApiKeys>["save"]) => {
      if (draft.trim() === "") {
        setRowError("Pega la clave antes de guardar.");
        return;
      }
      // El backend lo rechaza igual, pero con «La API key para 'groq'…».
      if (draft.trim().length < MIN_KEY_LENGTH) {
        setRowError("La clave es demasiado corta. Comprueba que la has copiado entera.");
        return;
      }
      setSaving(true);
      setRowError(null);
      try {
        await save({ provider, key: draft.trim() });
        setEditing(false);
        setDraft("");
        onClose();
      } catch (err: unknown) {
        setRowError(errorMessage(err, "Error al guardar."));
      } finally {
        setSaving(false);
      }
    },
  };
}
