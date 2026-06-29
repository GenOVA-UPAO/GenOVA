import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { OvaCreationView } from '@/features/ova_workspace/components/creation/OvaCreationView'
import { OvaEditView } from '@/features/ova_workspace/components/editor/OvaEditView'

export function OvaWorkspacePage() {
  const { ovaId, jobId } = useParams<{ ovaId?: string; jobId?: string }>()
  const navigate = useNavigate()

  const handleCreated = useCallback(
    (id: string) => navigate(`/ova/${id}/workspace`, { replace: true }),
    [navigate],
  )

  if (ovaId) return <OvaEditView ovaId={ovaId} />

  return <OvaCreationView onCreated={handleCreated} initialJobId={jobId} />
}
