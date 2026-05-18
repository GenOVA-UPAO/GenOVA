const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const SCORM_EXPORT_ENDPOINT = API_BASE_URL
  ? `${API_BASE_URL}/api/scorm/export`
  : '/api/scorm/export'

function triggerBrowserDownload(blob, filename) {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl)
  }, 0)
}

export async function exportScormPackage() {
  const response = await fetch(SCORM_EXPORT_ENDPOINT, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('No se pudo generar el paquete SCORM.')
  }

  const blob = await response.blob()
  triggerBrowserDownload(blob, 'ova-scorm.zip')
}
