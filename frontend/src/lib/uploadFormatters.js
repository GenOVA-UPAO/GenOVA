export function formatSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 KB'
  }

  const sizeInMb = sizeBytes / (1024 * 1024)
  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export function getUploadBadge(upload) {
  if (upload.status === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (upload.status === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}
