export function CanceledJobBanner() {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
      <p className="font-medium">La generación se canceló a petición tuya.</p>
      <p className="mt-1 text-muted-foreground">
        No es un error. Lo que ya se alcanzó a generar queda en Mis OVAs: ábrelo para reintentar el
        resto, o vuelve a Crear OVA cuando quieras.
      </p>
    </div>
  );
}
