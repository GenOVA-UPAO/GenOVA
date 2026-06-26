import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { updateOvaMetadata } from '../../ova_library/services/ovaHistoryService'

// El form vive en EditMetadataModal (React Hook Form). Este hook sólo maneja
// apertura/cierre del modal, los valores iniciales y la llamada a la API.
export function useOvaMetadata(onSaved) {
  const [metadataModalOpen, setMetadataModalOpen] = useState(false)
  const [metadataTargetId, setMetadataTargetId] = useState('')
  const [metadataInitial, setMetadataInitial] = useState({ title: '', description: '' })
  const [metadataSaving, setMetadataSaving] = useState(false)

  // Stable so it can be passed to the memoized OvaCard without busting memo.
  const openMetadataModal = useCallback((ova) => {
    setMetadataTargetId(ova.id)
    setMetadataInitial({ title: ova.title || '', description: ova.description || '' })
    setMetadataModalOpen(true)
  }, [])

  const closeMetadataModal = useCallback(() => {
    setMetadataModalOpen(false)
    setMetadataTargetId('')
  }, [])

  const saveMetadata = useCallback(
    async (values) => {
      setMetadataSaving(true)
      try {
        const response = await updateOvaMetadata(metadataTargetId, {
          title: values.title,
          description: values.description || '',
        })
        onSaved?.()
        toast.success(response.message || 'Metadatos actualizados correctamente.')
        setMetadataModalOpen(false)
        setMetadataTargetId('')
        return true
      } catch (err) {
        toast.error(err.message || 'No se pudieron guardar los metadatos.')
        return false
      } finally {
        setMetadataSaving(false)
      }
    },
    [metadataTargetId, onSaved],
  )

  return {
    metadataModalOpen,
    metadataInitial,
    metadataSaving,
    openMetadataModal,
    closeMetadataModal,
    saveMetadata,
  }
}
