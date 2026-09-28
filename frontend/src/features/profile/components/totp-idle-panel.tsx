import { Button } from "@/core/components/ui/button";

import { ErrorAlert } from "./error-alert";
import { ProfileSection } from "./profile-section";

interface TotpIdlePanelProps {
  serverError: string;
  isStarting: boolean;
  onStart: () => void;
}

export function TotpIdlePanel({ serverError, isStarting, onStart }: Readonly<TotpIdlePanelProps>) {
  return (
    <ProfileSection
      title="Verificación en dos pasos"
      description="Además de tu contraseña, al entrar se te pedirá un código de una app autenticadora como Google Authenticator o Authy."
    >
      <ErrorAlert message={serverError} />
      <Button variant="outline" className="max-sm:h-11 max-sm:w-full" loading={isStarting} onClick={onStart}>
        Activar verificación en dos pasos
      </Button>
    </ProfileSection>
  );
}
