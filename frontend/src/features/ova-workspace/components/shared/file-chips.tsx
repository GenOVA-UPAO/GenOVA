import type { UploadItem } from "../../lib/upload-types";
import { FileChip } from "./file-chip";

/** Archivos adjuntos con su estado: subiendo, indexando, listo, o por qué no se usará. */
export function FileChips({ files, onRemove }: Readonly<{ files: UploadItem[]; onRemove: (id: string) => void }>) {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-live="polite">
      {files.map((file) => (
        <FileChip key={file.clientId} file={file} onRemove={onRemove} />
      ))}
    </ul>
  );
}
