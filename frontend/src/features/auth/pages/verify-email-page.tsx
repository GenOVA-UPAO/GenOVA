import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { authStore } from "@/core/auth/auth-store";

import { AuthStatusCard } from "../components/auth-status-card";
import { VerifyEmailResult } from "../components/verify-email-result";
import { verifyEmail } from "../services/verification";

type Status = "verifying" | "success" | "error";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState(token ? "" : "Enlace de verificación inválido.");
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    verifyEmail(token)
      .then(async () => {
        await authStore.revalidate();
        setStatus("success");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
      });
  }, [token]);

  if (status === "verifying") {
    return (
      <AuthStatusCard>
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"
        />
        <p role="status" className="text-sm text-muted-foreground">Verificando tu correo…</p>
      </AuthStatusCard>
    );
  }

  return (
    <VerifyEmailResult
      status={status}
      message={message}
      onDashboard={() => {
        void navigate("/dashboard");
      }}
    />
  );
}
