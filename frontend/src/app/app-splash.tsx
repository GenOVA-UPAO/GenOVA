/** Shown while the first route's guard loader resolves (initial load only). */
export function AppSplash() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label="Cargando">
      <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
