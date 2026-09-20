import { useState } from "react";

import { RegisterForm } from "../components/register-form";
import { VerifyEmailNotice } from "../components/verify-email-notice";
import { resendVerification } from "../services/verification";

export function RegisterPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  if (registeredEmail) {
    return (
      <VerifyEmailNotice
        email={registeredEmail}
        onResend={() => resendVerification(registeredEmail)}
      />
    );
  }

  return <RegisterForm onRegistered={setRegisteredEmail} />;
}
