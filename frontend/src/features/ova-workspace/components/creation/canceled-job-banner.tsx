export function CanceledJobBanner() {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
      <p className="font-medium">La generación se canceló a petición tuya.</p>
      <p className="mt-1 text-muted-foreground">
        No es un error: no se guardó un OVA nuevo. Vuelve a Crear OVA cuando quieras.
      </p>
    </div>
  );
}
