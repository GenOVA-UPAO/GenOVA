export function MediaOffMessage({ task }: Readonly<{ task: string }>) {
  return (
    <p
      className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
      data-testid="media-gen-off"
    >
      {task === "video"
        ? "La generación de video está desactivada: los OVAs incluyen solo el guion. Los modelos de abajo se usarán cuando la actives."
        : "La generación de imágenes está desactivada: los OVAs no piden imágenes a la IA. Los modelos de abajo se usarán cuando la actives."}
    </p>
  );
}
