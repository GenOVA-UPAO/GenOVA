import { useEffect, useRef, useState } from "react";

import { type JobSnapshot,resourcesFingerprint, STALL_MS } from "../lib/ova-job-view-model";

const POLL_MS = 30_000;

/**
 * Detecta estancamiento en `running`: 3 min sin cambios en la huella de
 * recursos (STALL_MS). El reloj solo corre mientras el job está en marcha; el
 * booleano se recalcula en cada tick, no durante el render.
 */
export function useJobStall(snapshot: JobSnapshot | null | undefined, streaming: boolean): boolean {
  const [stalled, setStalled] = useState(false);
  const fingerprint = resourcesFingerprint(snapshot);
  const last = useRef({ fingerprint, at: 0 });
  const running = snapshot?.status === "running" && !streaming;
  useEffect(() => {
    if (!running) return undefined;
    if (last.current.at === 0 || last.current.fingerprint !== fingerprint) {
      last.current = { fingerprint, at: Date.now() };
    }
    const timer = window.setInterval(() => {
      setStalled(Date.now() - last.current.at > STALL_MS);
    }, POLL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [fingerprint, running]);
  return running && stalled;
}
