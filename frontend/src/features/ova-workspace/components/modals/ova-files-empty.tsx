import { Icon } from "@/core/components/icon";

export function OvaFilesEmpty() {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center">
      <Icon name="paperclip" size="text-lg" className="text-muted-foreground/60" />
      <p className="text-xs font-medium">Sin archivos adjuntos</p>
      <p className="text-xs text-muted-foreground">La IA generará sin contexto adicional.</p>
    </div>
  );
}
