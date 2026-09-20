import { lazy, Suspense, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";
import { PhaseDeleteConfirm } from "./phase-delete-confirm";

const PhaseVersionHistory = lazy(() => import("../versioning/phase-version-history"));

export function WorkspacePhaseItem({ ovaId, phase, onRegenerate }: Readonly<{ ovaId: string; phase: PhaseWithContent; onRegenerate: () => void }>) {
  const workspace = useOvaWorkspace(ovaId);
  const [content, setContent] = useState(phase.content ?? "");
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const error = workspace.savePhase.error ?? workspace.deletePhase.error;
  return (
    <article className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold">{resourceLabel(phase)}</h3>
      <label className="block">
        Contenido de fase
        <textarea
          rows={10}
          className="mt-2 w-full rounded border bg-background p-3 font-mono text-xs"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={workspace.savePhase.isPending}
          onClick={() => {
            workspace.savePhase.mutate({ phaseId: phase.id, content });
          }}
        >
          Guardar cambios
        </Button>
        <Button variant="outline" onClick={onRegenerate}>
          Regenerar recurso
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setHistory(true);
          }}
        >
          Versiones del recurso
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setConfirmDelete(true);
          }}
        >
          Eliminar recurso
        </Button>
      </div>
      {confirmDelete && (
        <PhaseDeleteConfirm
          pending={workspace.deletePhase.isPending}
          onConfirm={() => {
            workspace.deletePhase.mutate(phase.id);
          }}
          onCancel={() => {
            setConfirmDelete(false);
          }}
        />
      )}
      {error && <p role="alert">{error.message}</p>}
      {history && (
        <Suspense>
          <PhaseVersionHistory
            ovaId={ovaId}
            phaseId={phase.id}
            onClose={() => {
              setHistory(false);
            }}
          />
        </Suspense>
      )}
    </article>
  );
}
