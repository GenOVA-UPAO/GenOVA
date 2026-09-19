import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { ErrorAlert } from "./error-alert";

interface TotpIdlePanelProps {
  serverError: string;
  isStarting: boolean;
  onStart: () => void;
}

export function TotpIdlePanel({ serverError, isStarting, onStart }: Readonly<TotpIdlePanelProps>) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon name="shield-slash" size="text-lg" className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Autenticación en 2 pasos (2FA)</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Protege tu cuenta con un código de tu aplicación autenticadora (Google Authenticator, Authy,
        etc.).
      </p>
      <ErrorAlert message={serverError} />
      <Button size="sm" loading={isStarting} onClick={onStart}>
        Activar 2FA
      </Button>
    </div>
  );
}
