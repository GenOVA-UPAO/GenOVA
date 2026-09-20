import { useParams, useSearchParams } from "react-router";

import { CreationProgress } from "../components/creation/creation-progress";
import { OvaCreationView } from "../components/creation/ova-creation-view";
import { OvaEditView } from "../components/editor/ova-edit-view";

export function OvaWorkspacePage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const jobId = params.get("jobId");
  if (id) return <OvaEditView key={id} ovaId={id} />;
  if (jobId) return <CreationProgress key={jobId} jobId={jobId} />;
  return <OvaCreationView />;
}
