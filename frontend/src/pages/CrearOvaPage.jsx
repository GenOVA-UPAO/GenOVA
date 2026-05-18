import { ExportScormButton } from '../components/ExportScormButton.jsx'

export function CrearOvaPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Crear OVA</h1>
      <p className="text-slate-600">Configura y genera objetos virtuales de aprendizaje.</p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Exportación SCORM</h2>
        <p className="mt-1 text-sm text-slate-700">
          Descarga un paquete SCORM 1.2 de prueba listo para validación en Canvas y SCORM Cloud.
        </p>
        <div className="mt-4">
          <ExportScormButton />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">
          En esta pantalla se integrará el flujo de creación asistido por IA.
        </p>
      </div>
    </section>
  )
}

