export function MediaOffMessage({ task }: Readonly<{ task: string }>) {
  return (
    <p
      className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
      data-testid="media-gen-off"
    >
      {task === "video"
        ? "Generación de video desactivada: solo se producen prompts / guiones."
        : "Generación de imagen desactivada: el OVA no pedirá imágenes AI."}
    </p>
  );
}
