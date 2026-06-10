import { useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { OvaCreationView } from '../components/workspace/OvaCreationView.jsx'
import { OvaEditView } from '../components/workspace/OvaEditView.jsx'

/**
 * Unified OVA workspace — single surface for create AND edit.
 * - No ovaId param (/crear-ova)  → creation mode (OvaCreationView).
 * - ovaId param (/ova/:id/workspace) → edit mode (OvaEditView), full feature set.
 *
 * On successful creation the view hands off the new ovaId; we navigate to the
 * workspace URL with replace. Both routes render THIS component, so React keeps
 * the instance mounted and swaps creation→edit in place (no separate page).
 */
export function OvaWorkspacePage() {
  const { ovaId } = useParams()
  const navigate = useNavigate()

  const handleCreated = useCallback(
    (id) => navigate(`/ova/${id}/workspace`, { replace: true }),
    [navigate]
  )

  if (ovaId) return <OvaEditView ovaId={ovaId} />

  return <OvaCreationView onCreated={handleCreated} />
}
