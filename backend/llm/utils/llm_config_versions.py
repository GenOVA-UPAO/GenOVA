"""Perfiles de modelos e historial de cambios de la config de plataforma.

El administrador cambia de modelo a menudo. Dos ayudas, las dos en la tabla
key/value ``PlatformConfig`` junto a la config (``llm_config_store``):

- **Perfiles** (``llm_model_profiles``): la config completa (principal y
  respaldos por tarea, y los interruptores de imagen/video) guardada con un
  nombre, para volver a ella en un clic.
- **Historial** (``llm_model_config_history``): cada guardado que cambia algo
  deja una entrada con quién, cuándo, el antes y el después, y los cambios en
  lenguaje humano («Texto: DeepSeek V4.1 Flash → Claude Haiku 4.5»). Se guardan
  las ``HISTORY_LIMIT`` últimas; cualquiera se puede restaurar.

Nada de esto rompe un guardado: si el historial no se puede escribir se anota
en el log y la config queda guardada igual.
"""

import uuid
from datetime import UTC, datetime

import structlog

from llm.utils import llm_config_store as store

logger = structlog.get_logger(__name__)

PROFILES_KEY = "llm_model_profiles"
HISTORY_KEY = "llm_model_config_history"
HISTORY_LIMIT = 30
PROFILES_LIMIT = 20
NAME_MAX = 60

TASK_LABELS: dict[str, str] = {
    "texto": "Texto",
    "codigo": "Código / HTML",
    "orquestador": "Orquestador",
    "razonamiento": "Razonamiento",
    "imagen": "Imagen",
    "video": "Video",
}

NO_MODEL = "sin modelo"
NO_FALLBACKS = "ninguno"


class ProfileError(ValueError):
    """Petición de perfil no válida; `code` lo traduce el router a HTTP."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ── Instantáneas y diferencias ─────────────────────────────────────────────────


def _entry(raw) -> dict | None:
    if not isinstance(raw, dict):
        return None
    provider, model_id = raw.get("provider"), raw.get("model_id")
    if not provider or not model_id:
        return None
    return {"provider": provider, "model_id": model_id}


def snapshot(config: dict | None) -> dict:
    """Forma canónica y comparable de una config {defaults, fallbacks, generation_enabled}."""
    config = config or {}
    defaults_in = config.get("defaults") or {}
    fallbacks_in = config.get("fallbacks") or {}
    flags_in = config.get("generation_enabled") or {}
    defaults: dict[str, dict] = {}
    fallbacks: dict[str, list] = {}
    for task in store.CONFIG_TASKS:
        primary = _entry(defaults_in.get(task))
        if primary:
            defaults[task] = primary
        chain = [e for e in (_entry(x) for x in fallbacks_in.get(task) or []) if e]
        if chain:
            fallbacks[task] = chain
    flags = {
        t: flags_in[t] if isinstance(flags_in.get(t), bool) else store.GENERATION_DEFAULTS[t]
        for t in store.MEDIA_TASKS
    }
    return {"defaults": defaults, "fallbacks": fallbacks, "generation_enabled": flags}


def display_name(label: str | None, model_id: str) -> str:
    """Nombre visible: sin el prefijo «Fabricante: » cuando el resto lo repite
    (igual que `modelDisplayName` del frontend)."""
    name = (label or "").strip() or model_id
    vendor, sep, rest = name.partition(": ")
    if sep and len(vendor) >= 2 and rest.strip().lower().startswith(vendor.strip().lower()):
        return rest.strip()
    return name


def model_labels() -> dict[tuple[str, str], str]:
    """(proveedor, modelo) → nombre visible, según el catálogo en memoria."""
    from llm.catalog.catalog_refresh import get_catalog_entries, get_full_catalog_entries

    labels: dict[tuple[str, str], str] = {}
    for entry in [*get_full_catalog_entries(), *get_catalog_entries()]:
        key = (entry.get("provider"), entry.get("model_id"))
        if key[0] and key[1] and entry.get("label"):
            labels.setdefault(key, display_name(entry["label"], key[1]))
    return labels


def _name(entry: dict | None, labels: dict) -> str:
    if not entry:
        return NO_MODEL
    key = (entry["provider"], entry["model_id"])
    return labels.get(key) or display_name(None, entry["model_id"])


def _chain_name(chain: list[dict], labels: dict) -> str:
    return ", ".join(_name(e, labels) for e in chain) if chain else NO_FALLBACKS


def _flag_name(on: bool) -> str:
    return "activada" if on else "desactivada"


def describe_changes(before: dict, after: dict, labels: dict | None = None) -> list[dict]:
    """Cambios de `before` a `after`, tarea por tarea, en lenguaje humano."""
    labels = model_labels() if labels is None else labels
    a, b = snapshot(before), snapshot(after)
    changes: list[dict] = []
    for task in store.CONFIG_TASKS:
        task_label = TASK_LABELS.get(task, task)
        old_p, new_p = a["defaults"].get(task), b["defaults"].get(task)
        if old_p != new_p:
            old, new = _name(old_p, labels), _name(new_p, labels)
            changes.append(_change(task, "primary", old, new, f"{task_label}: {old} → {new}"))
        old_f, new_f = a["fallbacks"].get(task, []), b["fallbacks"].get(task, [])
        if old_f != new_f:
            old, new = _chain_name(old_f, labels), _chain_name(new_f, labels)
            text = f"{task_label}, respaldos: {old} → {new}"
            changes.append(_change(task, "fallbacks", old, new, text))
        if task in store.MEDIA_TASKS:
            old_g, new_g = a["generation_enabled"][task], b["generation_enabled"][task]
            if old_g != new_g:
                old, new = _flag_name(old_g), _flag_name(new_g)
                text = f"{task_label}, generación: {old} → {new}"
                changes.append(_change(task, "generation", old, new, text))
    return changes


def _change(task: str, field: str, before: str, after: str, text: str) -> dict:
    return {"task": task, "field": field, "before": before, "after": after, "text": text}


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def actor_of(user) -> dict:
    """Quién hizo el cambio, sin datos de más (id y nombre visible)."""
    name = getattr(user, "full_name", None) or getattr(user, "email", None) or "Administrador"
    return {"id": str(getattr(user, "id", "")), "name": name}


# ── Historial ──────────────────────────────────────────────────────────────────


def _load_list(key: str) -> list[dict]:
    data = store.read_platform_json(key)
    return [x for x in data if isinstance(x, dict)] if isinstance(data, list) else []


def load_history() -> list[dict]:
    """Entradas del historial, la más reciente primero."""
    return _load_list(HISTORY_KEY)


def record_change(
    before: dict,
    after: dict,
    user,
    *,
    source: str = "manual",
    detail: str | None = None,
) -> dict | None:
    """Añade una entrada al historial si `before` y `after` difieren.

    Devuelve la entrada (sin las instantáneas) o None si no hubo cambios o no se
    pudo escribir: el historial nunca tumba un guardado.
    """
    try:
        changes = describe_changes(before, after)
        if not changes:
            return None
        entry = {
            "id": _new_id(),
            "at": _now(),
            "actor": actor_of(user),
            "source": source,
            "detail": detail,
            "changes": changes,
            "before": snapshot(before),
            "after": snapshot(after),
        }
        history = [entry, *load_history()][:HISTORY_LIMIT]
        store.write_platform_json(HISTORY_KEY, history)
        return public_entry(entry)
    except Exception:
        logger.exception("llm config history write failed")
        return None


def public_entry(entry: dict) -> dict:
    """Entrada tal como la ve la interfaz (sin las instantáneas completas)."""
    return {k: entry.get(k) for k in ("id", "at", "actor", "source", "detail", "changes")}


def find_history_entry(entry_id: str) -> dict | None:
    return next((e for e in load_history() if e.get("id") == entry_id), None)


# ── Perfiles ───────────────────────────────────────────────────────────────────


def load_profiles() -> list[dict]:
    return _load_list(PROFILES_KEY)


def _save_profiles(profiles: list[dict]) -> None:
    store.write_platform_json(PROFILES_KEY, profiles)


def clean_name(raw) -> str:
    name = " ".join(str(raw or "").split())
    if not name:
        raise ProfileError("invalid_name", "Escribe un nombre para el perfil.")
    if len(name) > NAME_MAX:
        raise ProfileError(
            "invalid_name", f"El nombre es demasiado largo (máximo {NAME_MAX} caracteres)."
        )
    return name


def _ensure_unique(profiles: list[dict], name: str, skip_id: str | None = None) -> None:
    lowered = name.casefold()
    for p in profiles:
        if p.get("id") != skip_id and str(p.get("name", "")).casefold() == lowered:
            raise ProfileError("duplicate_name", f"Ya hay un perfil llamado «{name}».")


def create_profile(name, config: dict, user) -> dict:
    name = clean_name(name)
    profiles = load_profiles()
    _ensure_unique(profiles, name)
    if len(profiles) >= PROFILES_LIMIT:
        raise ProfileError(
            "limit_reached",
            f"Ya hay {PROFILES_LIMIT} perfiles guardados. Borra alguno para guardar otro.",
        )
    now = _now()
    profile = {
        "id": _new_id(),
        "name": name,
        "config": snapshot(config),
        "created_at": now,
        "updated_at": now,
        "created_by": actor_of(user),
    }
    _save_profiles([profile, *profiles])
    return profile


def _find(profiles: list[dict], profile_id: str) -> dict:
    for p in profiles:
        if p.get("id") == profile_id:
            return p
    raise ProfileError("not_found", "Ese perfil ya no existe.")


def get_profile(profile_id: str) -> dict:
    return _find(load_profiles(), profile_id)


def rename_profile(profile_id: str, name) -> dict:
    name = clean_name(name)
    profiles = load_profiles()
    profile = _find(profiles, profile_id)
    _ensure_unique(profiles, name, skip_id=profile_id)
    profile["name"] = name
    profile["updated_at"] = _now()
    _save_profiles(profiles)
    return profile


def delete_profile(profile_id: str) -> None:
    profiles = load_profiles()
    _find(profiles, profile_id)
    _save_profiles([p for p in profiles if p.get("id") != profile_id])


def profile_view(profile: dict, current: dict, labels: dict) -> dict:
    """Perfil para la interfaz, con lo que cambiaría respecto a la config actual."""
    return {
        "id": profile.get("id"),
        "name": profile.get("name"),
        "created_at": profile.get("created_at"),
        "updated_at": profile.get("updated_at"),
        "created_by": profile.get("created_by"),
        "config": snapshot(profile.get("config")),
        "changes": describe_changes(current, profile.get("config") or {}, labels),
    }
