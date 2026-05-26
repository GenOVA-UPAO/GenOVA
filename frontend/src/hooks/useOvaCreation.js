import { useState } from 'react'
import { useOvaUploads } from './useOvaUploads.js'
import {
  generateEngageResource,
  generateExploreResource,
  saveOva,
  downloadOvaScorm,
} from '../services/ovaCreationService.js'

const MIN_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)
const MAX_RETRIES = 2
const RETRY_BASE_MS = 2000

const PHASE_LABEL = { engage: 'ENGAGE', explore: 'EXPLORE' }
const GENERATORS = { engage: generateEngageResource, explore: generateExploreResource }

function buildSteps(engageCount, exploreCount) {
  const steps = []
  for (let i = 0; i < engageCount; i += 1) steps.push({ phase: 'engage', index: i })
  for (let i = 0; i < exploreCount; i += 1) steps.push({ phase: 'explore', index: i })
  return steps
}

function buildPhasesPayload(engageResults, exploreResults) {
  const engagePhases = engageResults.map((r, i) => ({
    type: 'engage',
    order: i + 1,
    content: r.html_content ?? '',
    title: `ENGAGE · ${r.tipo}`,
    resource_type_id: r.resource_type,
  }))
  const exploreOffset = engageResults.length
  const explorePhases = exploreResults.map((r, i) => ({
    type: 'explore',
    order: exploreOffset + i + 1,
    content: r.html_content ?? '',
    title: `EXPLORE · ${r.tipo}`,
    resource_type_id: r.resource_type,
  }))
  return [...engagePhases, ...explorePhases]
}

async function generateWithRetry(phase, resourceId, concept, uploadIds) {
  let lastErr = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await GENERATORS[phase](resourceId, concept, uploadIds)
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * 2 ** attempt
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

export function useOvaCreation() {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [engageSelection, setEngageSelection] = useState([])
  const [exploreSelection, setExploreSelection] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ pct: 0, label: '' })
  const [result, setResult] = useState(null)
  const [partial, setPartial] = useState({ engage: [], explore: [] })
  // Per-resource status: 'pending' | 'generating' | 'retrying' | 'done' | 'failed'
  const [stepStates, setStepStates] = useState([])
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const {
    uploads, uploadIds, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaUploads()

  const totalResources = engageSelection.length + exploreSelection.length
  const canConfigure = prompt.trim().length >= MIN_CHARS
  const canGenerate = canConfigure && totalResources > 0 && status !== 'generating'

  function confirmSelections({ engage, explore }) {
    setEngageSelection(engage ?? [])
    setExploreSelection(explore ?? [])
    setIsModalOpen(false)
  }

  function reset() {
    setPrompt('')
    setEngageSelection([])
    setExploreSelection([])
    setStatus('idle')
    setProgress({ pct: 0, label: '' })
    setResult(null)
    setPartial({ engage: [], explore: [] })
    setStepStates([])
    setError('')
  }

  async function generate() {
    if (!canGenerate) return
    setStatus('generating')
    setError('')
    setPartial({ engage: [], explore: [] })

    const concept = prompt.trim()
    const steps = buildSteps(engageSelection.length, exploreSelection.length)
    const totalSlots = steps.length + 1
    const collected = { engage: [], explore: [] }
    const states = steps.map(() => 'pending')
    setStepStates([...states])

    let failCount = 0
    for (let i = 0; i < steps.length; i += 1) {
      const { phase, index } = steps[i]
      const picks = phase === 'engage' ? engageSelection : exploreSelection
      const pick = picks[index]
      const pct = Math.round(((i + 1) / totalSlots) * 90)

      states[i] = 'generating'
      setStepStates([...states])
      setProgress({ pct, label: `Generando ${PHASE_LABEL[phase]} · ${pick.tipo}…` })

      try {
        const data = await generateWithRetry(phase, pick.id, concept, uploadIds)
        collected[phase].push(data)
        states[i] = 'done'
      } catch (err) {
        states[i] = 'failed'
        failCount += 1
        collected[phase].push(null)
      }
      setStepStates([...states])
      setPartial({ engage: [...collected.engage], explore: [...collected.explore] })
    }

    // Filter out failed resources before saving
    const okEngage = collected.engage.filter(Boolean)
    const okExplore = collected.explore.filter(Boolean)

    if (okEngage.length === 0 && okExplore.length === 0) {
      setError('Todos los recursos fallaron. Intenta de nuevo.')
      setStatus('error')
      return
    }

    try {
      setProgress({ pct: 95, label: 'Guardando OVA…' })
      const phasesPayload = buildPhasesPayload(okEngage, okExplore)
      const { ova_id } = await saveOva(concept, phasesPayload, uploadIds)

      const label = failCount ? `¡OVA listo! (${failCount} recurso(s) omitido(s))` : '¡OVA listo!'
      setProgress({ pct: 100, label })
      setResult({ engageResults: okEngage, exploreResults: okExplore, ovaId: ova_id })
      setStatus(failCount ? 'partial' : 'done')
      if (failCount) setError(`${failCount} recurso(s) no se pudieron generar.`)
    } catch (err) {
      setError(err.message || 'Error al guardar el OVA.')
      setStatus('error')
    }
  }

  async function handleExportScorm() {
    if (!result?.ovaId) return
    setIsExporting(true)
    try {
      await downloadOvaScorm(result.ovaId)
    } catch (err) {
      setError(err.message || 'Error al exportar SCORM.')
    } finally {
      setIsExporting(false)
    }
  }

  return {
    prompt, setPrompt,
    isModalOpen, openModal: () => setIsModalOpen(true), closeModal: () => setIsModalOpen(false),
    confirmSelections, engageSelection, exploreSelection, totalResources,
    status, progress, result, partial, error, stepStates,
    canConfigure, canGenerate,
    generate, reset, handleExportScorm, isExporting,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError, minChars: MIN_CHARS,
  }
}
