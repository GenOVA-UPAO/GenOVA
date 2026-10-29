import type { ReactNode } from "react";

import { WorkspaceApplyingBanner } from "./workspace-applying-banner";

/** Envuelve el editor; con una regeneración ya en curso al abrirlo, le pone encima el aviso. */
export function WorkspaceApplyingGate({ ovaId, status, busy, children }: Readonly<{ ovaId: string; status?: string; busy: boolean; children: ReactNode }>) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {status === "generando" && !busy && <WorkspaceApplyingBanner ovaId={ovaId} />}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
