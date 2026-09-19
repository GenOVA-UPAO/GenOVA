import { Button } from "@/core/components/ui/button";

import type { UploadItem } from "../../lib/upload-types";

export function FileChips({ files, onRemove }: Readonly<{ files: UploadItem[]; onRemove: (id: string) => void }>) {
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => (
        <li key={file.clientId} className="flex max-w-full items-center gap-2 rounded-full border px-3 text-xs">
          <span className="truncate" title={file.filename}>
            {file.filename}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Eliminar ${file.filename}`}
            onClick={() => {
              onRemove(file.clientId);
            }}
          >
            ×
          </Button>
        </li>
      ))}
    </ul>
  );
}
