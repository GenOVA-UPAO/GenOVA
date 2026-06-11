import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteTempFile, listTempFiles, uploadTempFiles } from '../../services/uploadService.js'

const MAX_UPLOAD_FILES = Number(import.meta.env.VITE_UPLOAD_MAX_FILES || 5)

function generateClientId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function fromServerItem(serverItem) {
  return {
    clientId: generateClientId(),
    uploadId: serverItem.upload_id,
    filename: serverItem.filename,
    contentType: serverItem.content_type,
    sizeBytes: Number(serverItem.size_bytes || 0),
    status: 'success',
    message: 'Carga exitosa',
    ragStatus: serverItem.rag_status,
  }
}

function toUploadingItem(file) {
  return {
    clientId: generateClientId(),
    uploadId: '',
    filename: file.name,
    contentType: file.type || '',
    sizeBytes: Number(file.size || 0),
    status: 'uploading',
    message: 'Subiendo...',
  }
}

export function useOvaUploads() {
  const [uploads, setUploads] = useState([])
  const [uploadError, setUploadError] = useState('')
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  useEffect(() => {
    async function loadTempUploads() {
      try {
        const data = await listTempFiles()
        const items = Array.isArray(data?.items) ? data.items : []
        setUploads(items.map(fromServerItem))
      } catch {
        setUploads([])
      }
    }

    loadTempUploads()
  }, [])

  const uploadIds = useMemo(() => {
    return uploads
      .filter((item) => item.status === 'success' && item.uploadId)
      .map((item) => item.uploadId)
  }, [uploads])

  const activeUploadsCount = uploads.length

  const handleFilesSelected = useCallback(
    async (fileList) => {
      const selectedFiles = Array.from(fileList || [])
      if (selectedFiles.length === 0) {
        return
      }

      setUploadError('')

      if (activeUploadsCount + selectedFiles.length > MAX_UPLOAD_FILES) {
        setUploadError(`Solo se permiten hasta ${MAX_UPLOAD_FILES} archivos en total.`)
        return
      }

      const uploadingItems = selectedFiles.map(toUploadingItem)
      const filePairs = uploadingItems.map((item, index) => ({ item, file: selectedFiles[index] }))

      setUploads((previous) => [...previous, ...uploadingItems])
      setIsUploadingFiles(true)

      await Promise.all(
        filePairs.map(async ({ item, file }) => {
          try {
            const result = await uploadTempFiles([file])
            const saved = result?.items?.[0]
            const failure = result?.errors?.[0]

            if (saved) {
              setUploads((previous) =>
                previous.map((current) =>
                  current.clientId === item.clientId
                    ? {
                        ...current,
                        uploadId: saved.upload_id,
                        filename: saved.filename,
                        contentType: saved.content_type,
                        sizeBytes: Number(saved.size_bytes || current.sizeBytes),
                        status: 'success',
                        message: 'Carga exitosa',
                        ragStatus: saved.rag_status,
                      }
                    : current
                )
              )
              return
            }

            const failureMessage = failure?.message || 'No se pudo cargar el archivo.'
            setUploads((previous) =>
              previous.map((current) =>
                current.clientId === item.clientId
                  ? { ...current, status: 'error', message: failureMessage }
                  : current
              )
            )
          } catch (error) {
            setUploads((previous) =>
              previous.map((current) =>
                current.clientId === item.clientId
                  ? {
                      ...current,
                      status: 'error',
                      message: error?.message || 'Error al subir archivo.',
                    }
                  : current
              )
            )
          }
        })
      )

      setIsUploadingFiles(false)
    },
    [activeUploadsCount]
  )

  const handleRemoveUpload = useCallback(async (clientId) => {
    const target = uploads.find((item) => item.clientId === clientId)
    if (!target) {
      return
    }

    if (target.uploadId) {
      try {
        await deleteTempFile(target.uploadId)
      } catch {
        // Si expiró en backend, permitimos limpiar la UI local.
      }
    }

    setUploads((previous) => previous.filter((item) => item.clientId !== clientId))
  }, [uploads])

  return {
    activeUploadsCount,
    handleFilesSelected,
    handleRemoveUpload,
    isUploadingFiles,
    maxUploadFiles: MAX_UPLOAD_FILES,
    uploadError,
    uploadIds,
    uploads,
  }
}
