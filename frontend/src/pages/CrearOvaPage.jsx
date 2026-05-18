import { ExportScormButton } from '../components/ExportScormButton.jsx'
import { OvaGenerationForm } from '../components/OvaGenerationForm.jsx'

export function CrearOvaPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Crear OVA</h1>
        <p className="text-slate-600">
          Genera material educativo desde un prompt y selecciona el modelo LLM según costo/calidad.
        </p>
      </header>

      <OvaGenerationForm />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Exportación SCORM</h2>
        <p className="mt-1 text-sm text-slate-700">
          Descarga un paquete SCORM 1.2 de prueba listo para validación en Canvas y SCORM Cloud.
        </p>
        <div className="mt-4">
          <ExportScormButton />
        </div>
      </div>
    </section>
  )
}


