import { useState } from "react";

import { DEFAULT_EXPORT_FORMAT, type ExportFormatId, isExportFormatId } from "./formats";

const STORAGE_KEY = "genova.export-format";

export function readLastExportFormat(): ExportFormatId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isExportFormatId(stored) ? stored : DEFAULT_EXPORT_FORMAT;
  } catch {
    return DEFAULT_EXPORT_FORMAT;
  }
}

function writeLastExportFormat(format: ExportFormatId): void {
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la preferencia solo dura la sesión.
  }
}

/** Último formato elegido (persistido); sirve de acción principal de los botones de descarga. */
export function useLastExportFormat(): readonly [ExportFormatId, (format: ExportFormatId) => void] {
  const [format, setFormat] = useState<ExportFormatId>(readLastExportFormat);
  const remember = (next: ExportFormatId) => {
    setFormat(next);
    writeLastExportFormat(next);
  };
  return [format, remember] as const;
}
