/**
 * Descarga compartida para respuestas que pueden ser un redirect JSON
 * (`{download_url, filename}` — Supabase Storage) o el binario directo
 * (fallback a disco). Antes duplicado en ova-library y ova-edit services.
 */

function clickAnchor(href: string, download?: string): void {
  const a = document.createElement("a");
  a.href = href;
  if (download) a.download = download;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function filenameFromDisposition(res: Response, fallback: string): string {
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match ? match[1] : fallback;
}

/** Dispara la descarga desde una respuesta OK. `fallbackFilename` se usa si el servidor no indica nombre. */
export async function triggerDownloadFromResponse(
  res: Response,
  fallbackFilename: string,
): Promise<void> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { download_url: string; filename?: string };
    clickAnchor(data.download_url, data.filename);
    return;
  }
  // disk fallback: stream binary
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  clickAnchor(url, filenameFromDisposition(res, fallbackFilename));
  URL.revokeObjectURL(url);
}
