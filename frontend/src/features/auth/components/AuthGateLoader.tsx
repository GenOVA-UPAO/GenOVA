// Spinner shown while AuthGate validates the current session against
// /api/auth/me. Mobile-first, accessible (role=status, aria-live=polite).

export function AuthGateLoader(): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-background p-4"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Verificando sesión…
        </p>
      </div>
    </div>
  )
}
