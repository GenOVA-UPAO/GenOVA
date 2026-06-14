import { apiFetch } from '../lib/http.js'

const UPLOADS_TEMP = '/api/uploads/temp'

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data?.message || 'No se pudo completar la operación de archivos.')
    error.code = data?.error || ''
    error.status = response.status
    throw error
  }
  return data
}

export async function uploadTempFiles(files) {
  const formData = new FormData()
  for (const file of files) formData.append('files', file)
  const res = await apiFetch(UPLOADS_TEMP, { method: 'POST', body: formData })
  return parseResponse(res)
}

export async function listTempFiles() {
  return parseResponse(await apiFetch(UPLOADS_TEMP))
}

export async function deleteTempFile(uploadId) {
  return parseResponse(await apiFetch(`${UPLOADS_TEMP}/${uploadId}`, { method: 'DELETE' }))
}
