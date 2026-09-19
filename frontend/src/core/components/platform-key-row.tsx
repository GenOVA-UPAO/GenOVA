import { useEffect, useRef, useState } from "react";

import { Icon } from "@/core/components/icon";
import { useSavePlatformKey } from "@/core/hooks/use-platform-config";

import { PlatformKeyActions } from "./platform-key-actions";
import { PlatformKeyInput } from "./platform-key-input";
import { providerMeta } from "./platform-key-meta";
import { PlatformKeyRowHeader } from "./platform-key-row-header";

interface PlatformKeyRowProps {
  provider: string;
  maskedValue?: string;
}

export function PlatformKeyRow({ provider, maskedValue = "" }: Readonly<PlatformKeyRowProps>) {
  const meta = providerMeta(provider);
  const inputRef = useRef<HTMLInputElement>(null);
  // null = sin editar: el input muestra la key enmascarada del servidor.
  const [draft, setDraft] = useState<string | null>(null);
  const save = useSavePlatformKey();
  const editing = draft !== null;
  const trimmed = draft?.trim() ?? "";

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const persist = (key: string) => {
    save.mutate(
      { provider, key },
      {
        onSuccess: () => {
          setDraft(null);
        },
      },
    );
  };
  const handleSave = () => {
    if (trimmed !== "") persist(trimmed);
  };

  return (
    <div className="glass-card space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/20">
      <PlatformKeyRowHeader meta={meta} configured={maskedValue !== ""} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <PlatformKeyInput
          label={`API key de ${meta.label}`}
          value={draft ?? maskedValue}
          placeholder={meta.placeholder}
          editing={editing}
          ref={inputRef}
          onChange={setDraft}
          onSubmit={handleSave}
        />
        <PlatformKeyActions
          editing={editing}
          configured={maskedValue !== ""}
          saving={save.isPending}
          canSave={trimmed !== ""}
          onSave={handleSave}
          onCancel={() => {
            setDraft(null);
          }}
          onEdit={() => {
            save.reset();
            setDraft("");
          }}
          onDelete={() => {
            persist("");
          }}
        />
      </div>
      {save.error && (
        <p role="alert" className="flex items-center gap-1 text-xs font-bold text-destructive">
          <Icon name="warning" size="text-xs" /> {save.error.message}
        </p>
      )}
    </div>
  );
}
