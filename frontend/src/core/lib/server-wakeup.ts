/**
 * Arranque en frío del backend (Render free se duerme): las primeras peticiones
 * tras un rato inactivo pueden tardar un minuto. Este módulo lleva la cuenta de
 * las peticiones "sospechosas" (auth y primera tras inactividad) y, si una pasa
 * de WAKEUP_NOTICE_DELAY_MS sin respuesta, enciende un aviso no bloqueante.
 */

export const WAKEUP_NOTICE_DELAY_MS = 3000;
/** Tope de las peticiones que pueden pillar el servidor dormido. */
export const COLD_START_TIMEOUT_MS = 90_000;
/** Pasado este tiempo sin respuestas se asume que el servidor pudo dormirse. */
const WARM_TTL_MS = 10 * 60_000;

let lastResponseAt = 0;
let pending = 0;
let visible = false;
const listeners = new Set<() => void>();

function emit(next: boolean): void {
  if (visible === next) return;
  visible = next;
  listeners.forEach((fn) => {
    fn();
  });
}

/** ¿Respondió el servidor hace poco? Si no, la próxima petición puede ser en frío. */
export function isServerWarm(now = Date.now()): boolean {
  return lastResponseAt > 0 && now - lastResponseAt < WARM_TTL_MS;
}

/**
 * Marca el inicio de una petición que podría despertar el servidor. Devuelve
 * `done()`, que hay que llamar al terminar (con o sin error).
 */
export function trackColdStart(): () => void {
  pending += 1;
  const timer = setTimeout(() => {
    emit(true);
  }, WAKEUP_NOTICE_DELAY_MS);
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    pending -= 1;
    if (pending <= 0) {
      pending = 0;
      emit(false);
    }
  };
}

/** Cualquier respuesta (también un 4xx/5xx) prueba que el servidor está despierto. */
export function markServerResponded(): void {
  lastResponseAt = Date.now();
}

export function subscribeServerWakeup(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getServerWakeupSnapshot(): boolean {
  return visible;
}

/** Timeout y seguimiento de una petición: las de auth y la primera en frío llevan margen y aviso. */
export function planRequest(
  coldCandidate: boolean,
  explicitTimeoutMs: number | undefined,
  defaultTimeoutMs: number,
): { timeoutMs: number; done: (() => void) | undefined } {
  return {
    timeoutMs: explicitTimeoutMs ?? (coldCandidate ? COLD_START_TIMEOUT_MS : defaultTimeoutMs),
    done: coldCandidate ? trackColdStart() : undefined,
  };
}

/** Solo tests. */
export function resetServerWakeup(): void {
  lastResponseAt = 0;
  pending = 0;
  visible = false;
  listeners.clear();
}
