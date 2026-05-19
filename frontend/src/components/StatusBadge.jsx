const STATUS_LABELS = {
  borrador: 'Borrador',
  generando: 'Generando',
  listo: 'Listo',
  error: 'Error',
}

const STATUS_CLASSES = {
  borrador: 'bg-slate-100 text-slate-700 border-slate-200',
  generando: 'bg-amber-50 text-amber-700 border-amber-200',
  listo: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-700 border-red-200',
}

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status] || STATUS_CLASSES.borrador}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}
