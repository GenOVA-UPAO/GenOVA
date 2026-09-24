import { type ReactNode, useId, useState } from "react";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";
import { LazyPhaseVersionHistory } from "../versioning/lazy-phase-version-history";
import { DeletePhaseConfirm } from "./delete-phase-confirm";
import { WorkspacePhaseActions } from "./workspace-phase-actions";
import { WorkspacePhaseCodeEditor } from "./workspace-phase-code-editor";
import { WorkspacePhaseItemHeader } from "./workspace-phase-item-header";

interface Props {
  ovaId: string;
  phase: PhaseWithContent;
  /** Hay una regeneración en curso: no se puede lanzar otra. */
  busy: boolean;
  onRegenerate: () => void;
  /** Controles de orden (subir/bajar) en la cabecera de la tarjeta. */
  reorder?: ReactNode;
}

/**
 * Un recurso en modo edición. Lo habitual (regenerar, ver versiones, ordenar,
 * eliminar) queda a la vista; el HTML, que pocos docentes tocan, se despliega.
 */
export function WorkspacePhaseItem({ ovaId, phase, busy, onRegenerate, reorder }: Readonly<Props>) {
  const workspace = useOvaWorkspace(ovaId);
  const saved = phase.content ?? "";
  const [content, setContent] = usePhaseDraft(saved);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorId = useId();
  const name = resourceLabel(phase);
  const dirty = content !== saved;
  const error = workspace.savePhase.error ?? workspace.deletePhase.error;
  return (
    <article className="rounded-xl border border-border bg-card">
      <WorkspacePhaseItemHeader name={name} saved={saved} dirty={dirty} reorder={reorder} />
      {editing && (
        <WorkspacePhaseCodeEditor
          id={editorId}
          value={content}
          dirty={dirty}
          saving={workspace.savePhase.isPending}
          saved={workspace.savePhase.isSuccess}
          onChange={setContent}
          onSave={() => {
            workspace.savePhase.mutate({ phaseId: phase.id, content });
          }}
          onDiscard={() => {
            setContent(saved);
          }}
        />
      )}
      <WorkspacePhaseActions
        editorId={editorId}
        editing={editing}
        busy={busy}
        onToggleEditor={() => {
          setEditing(!editing);
        }}
        onRegenerate={onRegenerate}
        onHistory={() => {
          setHistory(true);
        }}
        onDelete={() => {
          setConfirmDelete(true);
        }}
      />
      {error && (
        <p role="alert" className="border-t border-border px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      )}
      {confirmDelete && (
        <DeletePhaseConfirm
          name={name}
          isLoading={workspace.deletePhase.isPending}
          onConfirm={() => {
            workspace.deletePhase.mutate(phase.id, {
              onSettled: () => {
                setConfirmDelete(false);
              },
            });
          }}
          onCancel={() => {
            setConfirmDelete(false);
          }}
        />
      )}
      {history && (
        <LazyPhaseVersionHistory
          ovaId={ovaId}
          phaseId={phase.id}
          resourceName={name}
          onClose={() => {
            setHistory(false);
          }}
        />
      )}
    </article>
  );
}

/**
 * Borrador del HTML. Recuerda sobre qué versión se escribió: si el recurso
 * cambia fuera (se restaura una versión) y no había cambios propios, se sigue
 * al nuevo HTML en vez de sobrescribirlo al guardar.
 */
function usePhaseDraft(saved: string): [string, (text: string) => void] {
  const [draft, setDraft] = useState({ base: saved, text: saved });
  const untouched = draft.text === draft.base;
  const content = draft.base !== saved && untouched ? saved : draft.text;
  return [
    content,
    (text) => {
      setDraft({ base: saved, text });
    },
  ];
}
