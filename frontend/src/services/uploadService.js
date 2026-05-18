import { getToken } from '../lib/auth.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'
const UPLOADS_TEMP_ENDPOINT = `${API_BASE_URL}/api/uploads/temp`

function buildAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await fetch(UPLOADS_TEMP_ENDPOINT, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: formData,
  })

  return parseResponse(response)
}

export async function listTempFiles() {
  const response = await fetch(UPLOADS_TEMP_ENDPOINT, {
    headers: buildAuthHeaders(),
  })

  return parseResponse(response)
}

export async function deleteTempFile(uploadId) {
  const response = await fetch(`${UPLOADS_TEMP_ENDPOINT}/${uploadId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
  })

  return parseResponse(response)
}
