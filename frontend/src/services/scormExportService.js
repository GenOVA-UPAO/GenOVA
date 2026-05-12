const SCORM_EXPORT_ENDPOINT = 'http://localhost:8000/api/scorm/export'

function triggerBrowserDownload(blob, filename) {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
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
