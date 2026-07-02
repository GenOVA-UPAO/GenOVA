import { apiFetch } from '../../../core/lib/http/client'

const UPLOADS_TEMP = '/api/uploads/temp'

async function parseResponse(response: Response): Promise<unknown> {
  const data = (await response.json().catch(() => ({}))) as {
    message?: string
    error?: string
  }
  if (!response.ok) {
    const error = new Error(
      data?.message || 'No se pudo completar la operación de archivos.',
    ) as Error & { code?: string; status?: number }
    error.code = data?.error || ''
    error.status = response.status
    throw error
  }
  return data
}

export async function uploadTempFiles(files: Iterable<File>): Promise<unknown> {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  const res = await apiFetch(UPLOADS_TEMP, { method: 'POST', body: formData })
  return parseResponse(res)
}

export async function listTempFiles(): Promise<unknown> {
  return parseResponse(await apiFetch(UPLOADS_TEMP))
}

export async function deleteTempFile(uploadId: string): Promise<unknown> {
  return parseResponse(
    await apiFetch(`${UPLOADS_TEMP}/${uploadId}`, { method: 'DELETE' }),
  )
}
