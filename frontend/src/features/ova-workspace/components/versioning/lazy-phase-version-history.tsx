import { type ComponentProps, lazy, Suspense } from "react";

const PhaseVersionHistory = lazy(() => import("./phase-version-history"));

/** Historial de versiones de un recurso, que se descarga solo al abrirlo. */
export function LazyPhaseVersionHistory(
  props: Readonly<ComponentProps<typeof PhaseVersionHistory>>,
) {
  return (
    <Suspense>
      <PhaseVersionHistory {...props} />
    </Suspense>
  );
}
