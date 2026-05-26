import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { fetchOvaEditorData, pollRegenProgress, savePhaseContent, triggerRegen } from '../services/ovaEditService.js'
import { useRegenConfirmModal } from './useRegenConfirmModal.js'

const PHASE_LABELS = {
  motivacion: 'Motivación',
  contenido: 'Contenido',
  explicacion: 'Explicación',
  actividad: 'Actividad',
  evaluacion: 'Evaluación',
}

export { PHASE_LABELS }

export function useRegenEditor() {
  const { ovaId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [ovaData, setOvaData] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [phases, setPhases] = useState([])
  const [versions, setVersions] = useState([])
  const [currentVersionNum, setCurrentVersionNum] = useState(null)
  const [ovaStatus, setOvaStatus] = useState('')

  const [checkedPhases, setCheckedPhases] = useState(new Set())
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenProgress, setRegenProgress] = useState({ percentage: 0, stage: '' })
  const [downloading, setDownloading] = useState(false)

  const pollIntervalRef = useRef(null)

  const loadEditorData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOvaEditorData(ovaId)
      setOvaData(data)
      setOvaStatus(data.status)
      setPrompt(data.current_version?.prompt || '')
      setPhases(data.current_version?.phases || [])
      setVersions(data.version_history || [])
      setCurrentVersionNum(data.current_version?.version_number || null)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el editor del OVA.')
      if (err.message?.includes('permiso') || err.message?.includes('403')) {
        navigate('/mis-ovas')
      }
    } finally {
      setLoading(false)
    }
  }, [ovaId, navigate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del editor del OVA
    loadEditorData()
    return () => clearInterval(pollIntervalRef.current)
  }, [loadEditorData])

  const startPolling = (jobId) => {
    setIsRegenerating(true)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const prog = await pollRegenProgress(ovaId, jobId)
        setRegenProgress({ percentage: prog.percentage, stage: prog.stage })

        if (prog.status === 'success') {
          clearInterval(pollIntervalRef.current)
          setIsRegenerating(false)
          toast.success(`OVA regenerado. Nueva versión v${prog.new_version_number} creada.`)
          await loadEditorData()
        } else if (prog.status === 'error') {
          clearInterval(pollIntervalRef.current)
          setIsRegenerating(false)
          toast.error('Error al regenerar el OVA.')
          await loadEditorData()
        }
      } catch {
        clearInterval(pollIntervalRef.current)
        setIsRegenerating(false)
      }
    }, 1500)
  }

  const handleToggleCheck = (phaseId) => {
    setCheckedPhases((prev) => {
      const next = new Set(prev)
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId)
      return next
    })
  }

  const handleToggleAll = () => {
    if (checkedPhases.size === phases.length) {
      setCheckedPhases(new Set())
    } else {
      setCheckedPhases(new Set(phases.map((p) => p.id)))
    }
  }

  const handleSavePhase = async (phaseId, content) => {
    try {
      const res = await savePhaseContent(ovaId, phaseId, content)
      toast.success(res.message || 'Fase guardada.')
      await loadEditorData()
    } catch (err) {
      toast.error(err.message || 'Error al guardar la fase.')
      throw err
    }
  }

  const executeRegen = async (regenPrompt, faseIds) => {
    try {
      const res = await triggerRegen(ovaId, { prompt: regenPrompt, faseIds })
      setOvaStatus('generando')
      setCheckedPhases(new Set())
      startPolling(res.job_id)
    } catch (err) {
      toast.error(err.message || 'Error al iniciar la regeneración.')
    }
  }

  const {
    confirmModal,
    setConfirmModal,
    handleRegenSingle,
    handleRegenSelected,
    handleRegenFull,
  } = useRegenConfirmModal({
    prompt,
    phases,
    currentVersionNum,
    ovaData,
    executeRegen,
    checkedPhases,
  })

  return {
    loading,
    ovaData,
    prompt,
    setPrompt,
    phases,
    versions,
    currentVersionNum,
    ovaStatus,
    checkedPhases,
    historyOpen,
    setHistoryOpen,
    confirmModal,
    setConfirmModal,
    isRegenerating,
    regenProgress,
    downloading,
    setDownloading,
    selectedCount: checkedPhases.size,
    isReady: ovaStatus === 'listo',
    handleToggleCheck,
    handleToggleAll,
    handleSavePhase,
    handleRegenSingle,
    handleRegenSelected,
    handleRegenFull,
    loadEditorData,
  }
}
