export function createIdleProgress() {
  return {
    percentage: 0,
    stage: 'Pendiente',
    status: 'idle',
  }
}

export function createRunningProgress() {
  return {
    percentage: 0,
    stage: 'Validando solicitud',
    status: 'running',
  }
}

export function resolveStartGenerationFieldError(error) {
  const code = error?.code || ''
  if (
    code === 'prompt_required' ||
    code === 'prompt_too_short' ||
    code === 'llm_invalid' ||
    code === 'files_limit_exceeded' ||
    code === 'duplicate_upload_ids' ||
    code === 'upload_not_found'
  ) {
    return error?.message || 'Valida los campos del formulario.'
  }

  return ''
}

export function buildStartStatusMessage(uploadCount) {
  if (uploadCount > 0) {
    return `Generación iniciada con ${uploadCount} archivo(s). Monitoreando progreso...`
  }

  return 'Generación iniciada. Monitoreando progreso...'
}
