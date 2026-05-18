const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

import { getToken } from '../lib/auth.js'

const LLM_OPTIONS_ENDPOINT = `${API_BASE_URL}/api/ova/llm-options`
const START_GENERATION_ENDPOINT = `${API_BASE_URL}/api/ova/generate`

function buildAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}


async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data?.message || 'No se pudo completar la operación.')
    error.code = data?.error || ''
    error.status = response.status
    throw error
  }

  return data
}

export async function fetchLlmOptions() {
  const response = await fetch(LLM_OPTIONS_ENDPOINT, {
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}


export async function startOvaGeneration({ prompt, llmId, uploadIds = [] }) {
  const response = await fetch(START_GENERATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ prompt, llm_id: llmId, upload_ids: uploadIds }),
  })

  return parseResponse(response)
}


export async function fetchOvaProgress(jobId) {
  const response = await fetch(`${START_GENERATION_ENDPOINT}/${jobId}/progress`, {
    headers: buildAuthHeaders(),
  })
  return parseResponse(response)
}

