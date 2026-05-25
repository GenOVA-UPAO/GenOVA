import { useState } from 'react'
import { useOvaUploads } from './useOvaUploads.js'
import {
  generateEngageResource,
  generateExploreResource,
  saveOva,
  downloadOvaScorm,
} from '../services/ovaCreationService.js'

const MIN_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)

const STEPS = [
  { pct: 20, label: 'Generando recurso ENGAGE…' },
  { pct: 60, label: 'Generando recurso EXPLORE…' },
  { pct: 85, label: 'Guardando OVA…' },
  { pct: 100, label: '¡OVA listo!' },
]

export function useOvaCreation() {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [engageSelection, setEngageSelection] = useState(null)
  const [exploreSelection, setExploreSelection] = useState(null)
  const [status, setStatus] = useState('idle') // 'idle' | 'generating' | 'done' | 'error'
  const [progress, setProgress] = useState({ pct: 0, label: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const {
    uploads, uploadIds, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
  } = useOvaUploads()

  const canConfigure = prompt.trim().length >= MIN_CHARS
  const canGenerate = (
    canConfigure && !!engageSelection && !!exploreSelection && status !== 'generating'
  )

  function confirmSelections({ engage, explore }) {
    setEngageSelection(engage)
    setExploreSelection(explore)
    setIsModalOpen(false)
  }

  function reset() {
    setPrompt('')
    setEngageSelection(null)
    setExploreSelection(null)
    setStatus('idle')
    setProgress({ pct: 0, label: '' })
    setResult(null)
    setError('')
  }

  async function generate() {
    if (!canGenerate) return
    setStatus('generating')
    setError('')

    try {
      const concept = prompt.trim()

      setProgress(STEPS[0])
      const engageResult = await generateEngageResource(engageSelection.id, concept, uploadIds)

      setProgress(STEPS[1])
      const exploreResult = await generateExploreResource(exploreSelection.id, concept, uploadIds)

      setProgress(STEPS[2])
      const { ova_id } = await saveOva(
        concept,
        [
          { type: 'engage', order: 1, content: engageResult.html_content ?? '' },
          { type: 'explore', order: 2, content: exploreResult.html_content ?? '' },
        ],
        uploadIds
      )

      setProgress(STEPS[3])
      setResult({ engageResult, exploreResult, ovaId: ova_id })
      setStatus('done')
    } catch (err) {
      setError(err.message || 'Error al generar el OVA.')
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
    isModalOpen,
    openModal: () => setIsModalOpen(true),
    closeModal: () => setIsModalOpen(false),
    confirmSelections,
    engageSelection, exploreSelection,
    status, progress, result, error,
    canConfigure, canGenerate,
    generate, reset, handleExportScorm, isExporting,
    uploads, activeUploadsCount, handleFilesSelected, handleRemoveUpload,
    isUploadingFiles, maxUploadFiles, uploadError,
    minChars: MIN_CHARS,
  }
}
