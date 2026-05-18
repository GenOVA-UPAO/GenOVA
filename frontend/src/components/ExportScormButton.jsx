import { useState } from 'react'
import { exportScormPackage } from '../services/scormExportService.js'

export function ExportScormButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState('')

  async function handleExport() {
    setIsExporting(true)
    setMessage('Generando paquete SCORM...')

    try {
      await exportScormPackage()
      setMessage('Descarga iniciada: ova-scorm.zip')
    } catch {
      setMessage('No se pudo exportar SCORM. Verifica backend y vuelve a intentar.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? 'Exportando...' : 'Exportar SCORM'}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  )
}
