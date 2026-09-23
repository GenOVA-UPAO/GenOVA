/** Sin adjuntos: una línea bajo la zona de arrastre (antes era un segundo estado vacío con borde). */
export function OvaFilesEmpty() {
  return (
    <p className="text-xs text-muted-foreground">
      Aún no hay archivos. Sin ellos, la IA genera a partir de tu descripción.
    </p>
  );
}
