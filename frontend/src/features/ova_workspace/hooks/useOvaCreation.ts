import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOvaUploads } from './useOvaUploads'
import { useOvaJob } from './useOvaJob'
import { getResourceConfigs, putResourceConfigs } from '../services/resourceConfigsService'
import type { OvaTheme, Selections } from '../lib/types'

const MIN_CHARS = Number(import.meta.env.VITE_MIN_PROMPT_CHARS || 10)
const ALL_PHASES = ['engage', 'explore', 'explain', 'elaborate', 'evaluate']
const EMPTY_SELECTIONS: Selections = Object.fromEntries(ALL_PHASES.map((p) => [p, []]))

type Configs = Record<string, unknown>

// Thin orchestrator: prompt + modal selection state, composed with the upload
// hook (upload_ids) and the job hook (start/poll/retry via EN-013). No fetch
// here (R9) — all I/O is delegated.
export function useOvaCreation() {
  const [prompt, setPrompt] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selections, setSelections] = useState<Selections>(EMPTY_SELECTIONS)
  const [theme, setTheme] = useState<OvaTheme>({ color: 'upao', design: 'upao' })
  const [localConfigs, setLocalConfigs] = useState<Configs | null>(null)

  const { data: serverConfigs } = useQuery({
    queryKey: ['user', 'resource-configs'],
    queryFn: getResourceConfigs as () => Promise<{ configs?: Configs }>,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  const resourceConfigs = localConfigs ?? serverConfigs?.configs ?? {}

  const {
    uploads,
    uploadIds,
    activeUploadsCount,
    handleFilesSelected,
    handleRemoveUpload,
    isUploadingFiles,
    maxUploadFiles,
    uploadError,
  } = useOvaUploads()

  const jobApi = useOvaJob()
  const { phase, start, reset: resetJob, restore } = jobApi

  const totalResources = ALL_PHASES.reduce((s, p) => s + (selections[p]?.length ?? 0), 0)
  const phasesWithResources = ALL_PHASES.filter((p) => (selections[p]?.length ?? 0) > 0).length
  const isGenerating = phase === 'starting' || phase === 'polling'
  const canGenerate =
    prompt.trim().length >= MIN_CHARS && phasesWithResources >= 2 && !isGenerating

  const confirmSelections = useCallback((picks: Selections, configs: Configs = {}) => {
    setSelections({ ...EMPTY_SELECTIONS, ...picks })
    setLocalConfigs(configs)
    setIsModalOpen(false)
    putResourceConfigs(configs).catch(() => {})
  }, [])

  const reset = useCallback(() => {
    setPrompt('')
    setSelections(EMPTY_SELECTIONS)
    resetJob()
  }, [resetJob])

  const generate = useCallback(() => {
    if (!canGenerate) return
    start({ prompt: prompt.trim(), uploadIds, selections, theme, resourceConfigs })
  }, [canGenerate, start, prompt, uploadIds, selections, theme, resourceConfigs])

  const openModal = useCallback(() => setIsModalOpen(true), [])
  const closeModal = useCallback(() => setIsModalOpen(false), [])

  return {
    prompt,
    setPrompt,
    isModalOpen,
    openModal,
    closeModal,
    confirmSelections,
    selections,
    totalResources,
    resourceConfigs,
    theme,
    setTheme,
    canGenerate,
    isGenerating,
    generate,
    reset,
    restore,
    minChars: MIN_CHARS,
    job: jobApi,
    uploads,
    activeUploadsCount,
    handleFilesSelected,
    handleRemoveUpload,
    isUploadingFiles,
    maxUploadFiles,
    uploadError,
  }
}
