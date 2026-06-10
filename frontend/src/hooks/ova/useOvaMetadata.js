import { useState } from 'react'
import { toast } from 'sonner'
import { updateOvaMetadata } from '../services/ovaHistoryService.js'

export function useOvaMetadata(setOvas) {
  const [metadataModalOpen, setMetadataModalOpen] = useState(false)
  const [metadataTargetId, setMetadataTargetId] = useState('')
  const [metadataForm, setMetadataForm] = useState({ title: '', description: '' })
  const [metadataError, setMetadataError] = useState('')
  const [metadataSaving, setMetadataSaving] = useState(false)

  const openMetadataModal = (ova) => {
    setMetadataTargetId(ova.id)
    setMetadataForm({ title: ova.title || '', description: ova.description || '' })
    setMetadataError('')
    setMetadataModalOpen(true)
  }

  const closeMetadataModal = () => {
    setMetadataModalOpen(false)
    setMetadataTargetId('')
    setMetadataError('')
    setMetadataForm({ title: '', description: '' })
  }

  const handleMetadataChange = (event) => {
    const { name, value } = event.target
    setMetadataForm((prev) => ({ ...prev, [name]: value }))
    if (metadataError) setMetadataError('')
  }

  const handleMetadataSave = async () => {
    const trimmedTitle = metadataForm.title.trim()
    if (!trimmedTitle) {
      setMetadataError('El título es obligatorio.')
      return
    }
    if (trimmedTitle.length > 100) {
      setMetadataError('El título no puede superar 100 caracteres.')
      return
    }
    setMetadataSaving(true)
    setMetadataError('')
    try {
      const response = await updateOvaMetadata(metadataTargetId, {
        title: metadataForm.title,
        description: metadataForm.description,
      })
      setOvas((prev) =>
        prev.map((item) =>
          item.id === metadataTargetId
            ? { ...item, title: response.title, description: response.description }
            : item
        )
      )
      toast.success(response.message || 'Metadatos actualizados correctamente.')
      closeMetadataModal()
    } catch (err) {
      setMetadataError(err.message || 'No se pudieron guardar los metadatos.')
    } finally {
      setMetadataSaving(false)
    }
  }

  return {
    metadataModalOpen,
    metadataForm,
    metadataError,
    metadataSaving,
    openMetadataModal,
    closeMetadataModal,
    handleMetadataChange,
    handleMetadataSave,
  }
}
