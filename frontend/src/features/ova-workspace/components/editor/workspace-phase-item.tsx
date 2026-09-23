import { lazy, type ReactNode, Suspense, useId, useState } from "react";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";

const PhaseVersionHistory = lazy(() => import("../versioning/phase-version-history"));

interface Props {
  ovaId: string;
  phase: PhaseWithContent;
  onRegenerate: () => void;
  /** Controles de orden (subir/bajar) en la cabecera de la tarjeta. */
  reorder?: ReactNode;
}

/** Un recurso en modo edición: HTML editable, guardar, regenerar, versiones y eliminar. */
export function WorkspacePhaseItem({ ovaId, phase, onRegenerate, reorder }: Readonly<Props>) {
  const workspace = useOvaWorkspace(ovaId);
  const [content, setContent] = useState(phase.content ?? "");
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fieldId = useId();
  const name = resourceLabel(phase);
  const dirty = content !== (phase.content ?? "");
  const error = workspace.savePhase.error ?? workspace.deletePhase.error;
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex min-h-11 items-center gap-2 border-b border-border py-1 pr-1.5 pl-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold" title={name}>{name}</h3>
        {reorder}
      </header>
      <div className="space-y-1.5 p-3">
        <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">Código HTML del recurso</label>
        <textarea
          id={fieldId}
          rows={8}
          spellCheck={false}
          className="block w-full resize-y rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
          }}
        />
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <Button
          size="sm"
          disabled={!dirty}
          loading={workspace.savePhase.isPending}
          aria-describedby={`${fieldId}-state`}
          onClick={() => {
            workspace.savePhase.mutate({ phaseId: phase.id, content });
          }}
        >
          Guardar cambios
        </Button>
        <span id={`${fieldId}-state`} className="text-xs text-muted-foreground">
          {dirty ? "Cambios sin guardar" : "Sin cambios"}
        </span>
        <span className="flex flex-wrap items-center gap-1 sm:ml-auto">
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            <Icon name="arrow-clockwise" />
            Regenerar recurso
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setHistory(true); }}>
            <Icon name="clock-counter-clockwise" />
            Versiones del recurso
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { setConfirmDelete(true); }}>
            <Icon name="trash" />
            Eliminar recurso
          </Button>
        </span>
      </footer>
      {error && <p role="alert" className="border-t border-border px-3 py-2 text-sm text-destructive">{error.message}</p>}
      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar este recurso?"
          message={`Se quitará «${name}» del OVA.`}
          confirmLabel="Confirmar eliminación"
          isLoading={workspace.deletePhase.isPending}
          onConfirm={() => {
            workspace.deletePhase.mutate(phase.id, { onSettled: () => { setConfirmDelete(false); } });
          }}
          onCancel={() => { setConfirmDelete(false); }}
        />
      )}
      {history && (
        <Suspense>
          <PhaseVersionHistory ovaId={ovaId} phaseId={phase.id} resourceName={name} onClose={() => { setHistory(false); }} />
        </Suspense>
      )}
    </article>
  );
}
