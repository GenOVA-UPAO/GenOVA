import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { authStore } from "@/core/auth/auth-store";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import { confirmEmailChange } from "../api/profile.api";
import { profileKeys } from "../hooks/use-profile";

interface PendingEmailConfirmProps {
  pendingEmail: string;
  onConfirmed: (email: string) => void;
}

// Paso 2 del cambio de correo: el actual sigue vigente hasta confirmar el código
//  enviado al nuevo buzón.
export function PendingEmailConfirm({
  pendingEmail,
  onConfirmed,
}: Readonly<PendingEmailConfirmProps>) {
  const id = useId();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await confirmEmailChange(code.trim());
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await authStore.revalidate();
      onConfirmed(String(result.email));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-sm text-pretty">
        Tu correo actual sigue vigente. Enviamos un código a <strong>{pendingEmail}</strong>:
        escríbelo aquí para completar el cambio.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`${id}-code`}>Código de confirmación</Label>
          <Input
            id={`${id}-code`}
            value={code}
            autoComplete="one-time-code"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setCode(e.target.value);
            }}
          />
        </div>
        <Button
          type="button"
          className="max-sm:h-11"
          loading={busy}
          disabled={!code.trim()}
          onClick={() => {
            void confirm();
          }}
        >
          Confirmar correo
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
