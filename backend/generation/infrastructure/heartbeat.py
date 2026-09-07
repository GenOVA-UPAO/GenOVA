"""Latido de la fila ova_jobs durante la generación (EN-013).

El nodo de fase solo late al ENTRAR a la fase (runtime._touch_job); un recurso
lento (p.ej. el modelo 'codigo' tarda 2-3 min) deja pasar >STALE_AFTER_SECONDS
sin latido y el sweep marca el job 'interrupted' aunque está sano → el front lo
relanza ("carga indefinida"). Un latido cada HEARTBEAT_S lo evita.
"""

from __future__ import annotations

import threading


def start_heartbeat(job_id, interval_s: float) -> tuple[threading.Thread, threading.Event]:
    """Lanza un hilo daemon que bombea OvaJob.updated_at cada intervalo hasta
    que se señala el stop. Si el proceso muere, el hilo muere con él y el sweep
    vuelve a detectar el job como interrumpido (comportamiento deseado)."""
    from prometheus.engine.runtime import _touch_job

    stop = threading.Event()

    def _run() -> None:
        while not stop.wait(interval_s):
            _touch_job(str(job_id))

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t, stop
