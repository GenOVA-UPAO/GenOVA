import { apiFetch } from "@/core/lib/http";

const UPLOADS_TEMP = "/api/uploads/temp";

interface ServerItem {
  upload_id: string;
  filename: string;
  content_type: string;
  size_bytes?: number;
  rag_status?: unknown;
}

async function parseResponse(response: Response): Promise<unknown> {
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data?.message || "No se pudo completar la operación de archivos.");
  }
  return data;
}

export async function uploadTempFiles(
  files: Iterable<File>,
): Promise<{ items?: ServerItem[]; errors?: { message?: string }[] }> {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  const res = await apiFetch(UPLOADS_TEMP, { method: "POST", body: formData });
  return parseResponse(res) as { items?: ServerItem[]; errors?: { message?: string }[] };
}

export async function listTempFiles(): Promise<{ items?: ServerItem[] }> {
  return parseResponse(await apiFetch(UPLOADS_TEMP)) as { items?: ServerItem[] };
}

export async function deleteTempFile(uploadId: string): Promise<unknown> {
  return parseResponse(await apiFetch(`${UPLOADS_TEMP}/${uploadId}`, { method: "DELETE" }));
}

export type { ServerItem };
