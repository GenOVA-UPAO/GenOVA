export function formatSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 KB'
  }

  const sizeInMb = sizeBytes / (1024 * 1024)
  if (sizeInMb >= 1) {
    return `${sizeInMb.toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export function getUploadBadge(upload: { status: string }): string {
  if (upload.status === 'success') {
    return 'border-primary/20 bg-primary/10 text-primary'
  }

  if (upload.status === 'error') {
    return 'border-destructive/20 bg-destructive/10 text-destructive'
  }

  return 'border-border bg-muted text-muted-foreground'
}
