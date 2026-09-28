/** Estado sin comprobar: solo se sabe si hay clave guardada (o en el servidor). */
export function PlatformKeyState({
  configured,
  serverKey,
}: Readonly<{ configured: boolean; serverKey: boolean }>) {
  if (configured || serverKey) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success-strong">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
        {configured ? "Conectado" : "Conectado con la clave del servidor"}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Sin conectar</span>;
}
