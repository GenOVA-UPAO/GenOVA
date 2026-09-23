/** Error de carga de una sección de Plataforma. */
export function SectionError({ message }: Readonly<{ message: string }>) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
