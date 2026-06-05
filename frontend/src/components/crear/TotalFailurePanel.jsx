// R8 — total failure: no resource completed, so no OVA is created. Show a
// general error with an Error ID (from any failed resource) + a retry-all CTA.
// Never render an empty OVA.
export function TotalFailurePanel({ viewModel = [], onRetryAll }) {
  const errorId = viewModel.find((r) => r.error_id)?.error_id

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-rose-900">No se pudo generar el OVA</h2>
        <p className="mt-1 text-sm text-rose-700">
          Lo sentimos, hubo un error generando los recursos. Ningún recurso se completó, por lo
          que no se guardó ningún OVA.
        </p>
        {errorId && (
          <p className="mt-1 text-xs text-rose-600">
            Error ID: <span className="font-mono">{errorId}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRetryAll}
        className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
      >
        Reintentar generación
      </button>
    </div>
  )
}
