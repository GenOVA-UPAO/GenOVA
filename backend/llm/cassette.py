"""Cassettes LLM: grabar y reproducir las respuestas de texto (y visión).

Sirve para probar el flujo REAL de generación (prompts reales → salida real del
modelo → parseo/validación/reparación/refinado/crítico/editor → HTML/SCORM) sin
gastar nada por ejecución: se graba una vez contra el proveedor y los tests
reproducen lo grabado sin red ni claves.

Se engancha en la costura única de las llamadas de texto (`llm.router._chat_once`)
y de visión (`_vision_once`). Todo lo que hay por encima (cadena de respaldos,
continuación por `finish_reason == "length"`, presupuesto) corre de verdad.

Modos (`LLM_CASSETTE_MODE` o `use_cassette(..., mode=...)`):
  - off     no intercepta nada (por defecto).
  - record  llama al proveedor y guarda cada respuesta (o error) en el cassette.
  - replay  responde desde el cassette; una llamada sin grabar lanza
            `CassetteMissError` con su clave: jamás cae al proveedor.

Clave de coincidencia (robusta al no-determinismo):
  1. Exacta: sha256 de (proveedor, modelo, mensajes normalizados). Normalizar
     quita lo volátil: UUIDs, marcas de tiempo ISO, data URIs (imágenes en base64)
     y hex largos; así un id de job o una fecha en el prompt no rompen el match.
  2. Solo mensajes: el mismo prompt grabado con otro proveedor/modelo (la cadena
     cambió de primario) sigue valiendo; se prefieren entradas sin error.
  3. Posicional (salvo `LLM_CASSETTE_STRICT=1`): la siguiente entrada sin usar
     con la misma forma (max_tokens y nº de mensajes). Cubre un prompt retocado
     en el TOML sin regrabar; se avisa en el log para regrabar cuando convenga.
Si la misma clave aparece varias veces se consumen en orden (p. ej. un 429 y
después el reintento correcto); agotadas, se repite la última.

Formato: un JSON legible por cassette (`{"version": 1, "entries": [...]}`). Cada
entrada guarda la clave, proveedor, modelo, max_tokens, un extracto del prompt
(inicio, final, longitud; el prompt completo sale del código del repo) y la
respuesta `{"content", "finish_reason"}` o el error `{"kind", "status",
"message"}` con kind ∈ status|timeout|connection|empty. Nunca se guardan claves
ni cabeceras. Los tests de inyección de fallos escriben entradas de error a mano
(`Cassette.add`) para ejercitar la cadena de respaldos y la continuación offline.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
import re
import threading
from collections.abc import Callable, Iterator
from pathlib import Path

import httpx
import openai
import structlog

from core.config import settings
from llm.utils.llm_helpers import _RECOVERABLE_ERRORS, EmptyContentError

logger = structlog.get_logger(__name__)

OFF, RECORD, REPLAY = "off", "record", "replay"
_PREVIEW_HEAD, _PREVIEW_TAIL = 400, 200

_VOLATILE = (
    (re.compile(r"data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+"), "<data-uri>"),
    (
        re.compile(
            r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
        ),
        "<uuid>",
    ),
    (
        re.compile(
            r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b"
        ),
        "<ts>",
    ),
    (re.compile(r"\b[0-9a-fA-F]{32,}\b"), "<hex>"),
)
_SECRET = re.compile(r"\b(sk|gsk|hf|key)[-_][A-Za-z0-9_-]{12,}")


class CassetteMissError(RuntimeError):
    """Replay sin entrada grabada para la llamada: hay que regrabar el cassette."""


def _norm_text(text: str) -> str:
    for rx, repl in _VOLATILE:
        text = rx.sub(repl, text)
    return text.strip()


def _norm_content(content) -> object:
    if isinstance(content, str):
        return _norm_text(content)
    if isinstance(content, list):  # bloques multimodales (visión)
        return [_norm_content(c) for c in content]
    if isinstance(content, dict):
        return {k: _norm_content(v) for k, v in sorted(content.items())}
    return content


def normalize_messages(msgs: list[dict]) -> list[dict]:
    return [{"role": m.get("role"), "content": _norm_content(m.get("content"))} for m in msgs]


def _sha(obj: object) -> str:
    raw = json.dumps(obj, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:24]


def call_keys(provider: str, model_id: str, msgs: list[dict]) -> tuple[str, str]:
    """(clave exacta, clave solo-mensajes) de una llamada."""
    norm = normalize_messages(msgs)
    return _sha([provider, model_id, norm]), _sha(norm)


def _preview(msgs: list[dict]) -> dict:
    last = msgs[-1].get("content") if msgs else ""
    text = last if isinstance(last, str) else json.dumps(_norm_content(last), ensure_ascii=False)
    text = _norm_text(text)
    tail = text[-_PREVIEW_TAIL:] if len(text) > _PREVIEW_HEAD + _PREVIEW_TAIL else ""
    return {"head": text[:_PREVIEW_HEAD], "tail": tail, "chars": len(text)}


def _scrub(message: str) -> str:
    return _SECRET.sub(r"\1-***", message or "")[:500]


def error_entry(exc: BaseException) -> dict:
    """Error de proveedor → dict grabable (sin claves ni cabeceras)."""
    if isinstance(exc, EmptyContentError):
        return {"kind": "empty", "message": _scrub(str(exc))}
    status = getattr(exc, "status_code", None)
    if status is not None:
        return {"kind": "status", "status": int(status), "message": _scrub(str(exc))}
    kind = "timeout" if "Timeout" in type(exc).__name__ else "connection"
    return {"kind": kind, "message": _scrub(str(exc))}


_STATUS_ERRORS = {
    400: openai.BadRequestError,
    401: openai.AuthenticationError,
    403: openai.PermissionDeniedError,
    404: openai.NotFoundError,
    429: openai.RateLimitError,
}


def build_error(err: dict, provider: str, model_id: str) -> Exception:
    """dict grabado → la excepción del SDK que lanzaría el proveedor."""
    kind, msg = err.get("kind", "status"), err.get("message") or f"{provider}/{model_id} falló"
    request = httpx.Request("POST", f"https://cassette.invalid/{provider}/chat/completions")
    if kind == "empty":
        return EmptyContentError(msg)
    if kind == "timeout":
        return openai.APITimeoutError(request=request)
    if kind == "connection":
        return openai.APIConnectionError(message=msg, request=request)
    status = int(err.get("status", 500))
    # retry-after 0: el backoff del router no espera en replay.
    response = httpx.Response(status, request=request, headers={"retry-after": "0"})
    cls = _STATUS_ERRORS.get(
        status, openai.InternalServerError if status >= 500 else openai.APIStatusError
    )
    return cls(msg, response=response, body=None)


def _load_entries(path: Path) -> list[dict]:
    if not path.exists():
        raise CassetteMissError(f"No existe el cassette {path}: grábalo antes (modo record)")
    return json.loads(path.read_text(encoding="utf-8")).get("entries", [])


class Cassette:
    """Un archivo de cassette: entradas grabadas y su consumo en replay.

    `base`: otros cassettes cuyas entradas también valen para responder (p. ej.
    los de cada recurso dentro del OVA completo). En record, una llamada que ya
    está en `base` con la misma clave exacta se responde de ahí sin pagarla otra
    vez; solo lo nuevo se graba en `path`.
    """

    def __init__(
        self,
        path: str | Path,
        mode: str = REPLAY,
        *,
        strict: bool | None = None,
        base: tuple[str | Path, ...] | list = (),
    ):
        self.path = Path(path)
        self.mode = mode
        self.strict = settings.llm_cassette_strict if strict is None else strict
        # Grabar empieza de cero: regrabar reemplaza el cassette entero.
        self.entries: list[dict] = _load_entries(self.path) if mode == REPLAY else []
        self.base: list[dict] = [e for b in base for e in _load_entries(Path(b))]
        self._pool = self.entries + self.base if mode == REPLAY else self.base
        self._used: set[int] = set()
        self._lock = threading.RLock()

    # ── escritura ────────────────────────────────────────────────────────────
    def add(
        self,
        provider: str,
        model_id: str,
        msgs: list[dict],
        max_tokens: int = 0,
        *,
        content: str | None = None,
        finish_reason: str | None = "stop",
        error: dict | None = None,
        label: str = "",
    ) -> dict:
        key, msgs_key = call_keys(provider, model_id, msgs)
        entry: dict = {
            "key": key,
            "msgs_key": msgs_key,
            "provider": provider,
            "model_id": model_id,
            "max_tokens": max_tokens,
            "n_messages": len(msgs),
            "prompt": _preview(msgs),
        }
        if label:
            entry["label"] = label
        if error is not None:
            entry["error"] = error
        else:
            entry["response"] = {"content": content, "finish_reason": finish_reason}
        with self._lock:
            self.entries.append(entry)
        return entry

    def reusable(self, provider: str, model_id: str, msgs: list[dict]) -> dict | None:
        """En record: respuesta ya grabada en `base` con la clave exacta (sin error)."""
        key, _ = call_keys(provider, model_id, msgs)
        return next((e for e in self.base if e["key"] == key and "error" not in e), None)

    def save(self) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            data = {"version": 1, "entries": self.entries}
            self.path.write_text(
                json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
            )

    # ── lectura ──────────────────────────────────────────────────────────────
    def _take(self, idxs: list[int]) -> dict | None:
        fresh = [i for i in idxs if i not in self._used]
        if fresh:
            self._used.add(fresh[0])
            return self._pool[fresh[0]]
        return self._pool[idxs[-1]] if idxs else None

    def lookup(self, provider: str, model_id: str, msgs: list[dict], max_tokens: int) -> dict:
        key, msgs_key = call_keys(provider, model_id, msgs)
        pool = self._pool
        with self._lock:
            hit = self._take([i for i, e in enumerate(pool) if e["key"] == key])
            if hit is None:
                same = [i for i, e in enumerate(pool) if e["msgs_key"] == msgs_key]
                hit = self._take([i for i in same if "error" not in pool[i]] or same)
            if hit is None and not self.strict:
                shape = [
                    i
                    for i, e in enumerate(pool)
                    if i not in self._used
                    and "error" not in e
                    and e.get("max_tokens") == max_tokens
                    and e.get("n_messages") == len(msgs)
                ]
                hit = self._take(shape[:1])
                if hit is not None:
                    logger.warning(
                        "cassette: prompt changed, positional match (re-record)",
                        cassette=str(self.path),
                        key=key,
                        recorded_key=hit["key"],
                    )
        if hit is None:
            raise CassetteMissError(
                f"Cassette {self.path.name}: no hay respuesta grabada para la clave {key} "
                f"({provider}/{model_id}, max_tokens={max_tokens}, {len(msgs)} mensajes, "
                f"prompt: {_preview(msgs)['head'][:160]!r}…). Regrábalo con "
                "scripts/record_llm_cassettes.py."
            )
        return hit


_active: Cassette | None = None
_env_cassette: Cassette | None = None
_active_lock = threading.Lock()


def active() -> Cassette | None:
    """Cassette en uso: el de `use_cassette` o, si no, el del entorno (LLM_CASSETTE_MODE)."""
    global _env_cassette
    if _active is not None:
        return _active
    mode = (settings.llm_cassette_mode or OFF).strip().lower()
    if mode not in (RECORD, REPLAY):
        return None
    with _active_lock:
        if _env_cassette is None or _env_cassette.mode != mode:
            _env_cassette = Cassette(Path(settings.llm_cassette_dir) / "session.json", mode)
    return _env_cassette


def replaying() -> bool:
    c = active()
    return c is not None and c.mode == REPLAY


@contextlib.contextmanager
def use_cassette(
    path: str | Path, mode: str = REPLAY, *, strict: bool | None = None, base=()
) -> Iterator[Cassette]:
    """Activa un cassette para todas las llamadas (todos los hilos) del bloque."""
    global _active
    cassette = Cassette(path, mode, strict=strict, base=base)
    with _active_lock:
        previous, _active = _active, cassette
    try:
        yield cassette
    finally:
        with _active_lock:
            _active = previous
        if mode == RECORD:
            cassette.save()


def _record_error(c: Cassette, provider, model_id, msgs, max_tokens, exc: Exception) -> None:
    if isinstance(exc, _RECOVERABLE_ERRORS):
        c.add(provider, model_id, msgs, max_tokens, error=error_entry(exc))
        c.save()


def intercept_chat(
    provider: str,
    model_id: str,
    msgs: list[dict],
    max_tokens: int,
    real_call: Callable[[], tuple[str, str | None]],
) -> tuple[str, str | None]:
    """Costura de `_chat_once`: sin cassette llama al proveedor tal cual."""
    c = active()
    if c is None:
        return real_call()
    if c.mode == REPLAY:
        entry = c.lookup(provider, model_id, msgs, max_tokens)
        if "error" in entry:
            raise build_error(entry["error"], provider, model_id)
        resp = entry["response"]
        if not (resp.get("content") or "").strip():
            raise EmptyContentError(f"Empty content from {provider}/{model_id} (cassette)")
        return resp["content"], resp.get("finish_reason")
    reused = c.reusable(provider, model_id, msgs)
    if reused is not None:
        return reused["response"]["content"], reused["response"].get("finish_reason")
    try:
        content, finish = real_call()
    except Exception as exc:
        _record_error(c, provider, model_id, msgs, max_tokens, exc)
        raise
    c.add(provider, model_id, msgs, max_tokens, content=content, finish_reason=finish)
    c.save()
    return content, finish


def intercept_vision(
    provider: str, model_id: str, msgs: list[dict], max_tokens: int, real_call: Callable[[], str]
) -> str:
    """Costura de `_vision_once` (misma lógica; la respuesta es solo texto)."""
    content, _ = intercept_chat(provider, model_id, msgs, max_tokens, lambda: (real_call(), "stop"))
    return content
