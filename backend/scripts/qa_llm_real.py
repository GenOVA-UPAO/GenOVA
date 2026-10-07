"""QA semanal con LLM real: detecta fallos de CONTENIDO que LLM_FAKE no ve.

Uso (backend ya levantado con LLM_FAKE=0 y OPENROUTER_API_KEY real):

    python -m scripts.qa_llm_real --base-url http://localhost:8000 --out-dir qa-out

Genera 3 OVAs (3 recursos cada uno) con distinta área temática, comprueba con
heurísticas tolerantes (umbrales, no exactitud) que el contenido corresponde al
tema/área/configuración, y escribe un informe Markdown (+ el texto de cada
recurso). Sale con código 1 si falla alguna comprobación. NUNCA imprime la clave.
"""

from __future__ import annotations

import argparse
import html as htmllib
import io
import os
import re
import sys
import time
import unicodedata
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from scripts.ova_e2e.client import ApiClient, ApiError  # noqa: E402

RESOURCES = [
    {"phase_type": "engage", "resource_type": "1"},
    {"phase_type": "explain", "resource_type": "1"},
    {"phase_type": "evaluate", "resource_type": "1"},
]
QUIZ_QUESTIONS = 4  # el default de la plantilla es 6: así se prueba que se respeta
BUDGET_USD = 0.10
_TERMINAL = {"done", "error", "interrupted", "canceled"}

FORBIDDEN_ORACLE = ("oracle", "sgbd")
TREE_TERMS = (
    "decision", "nodo", "clasificacion", "entropia", "gini", "hoja", "raiz", "rama",
    "division", "particion", "regresion", "poda", "sobreajuste", "atributo",
    "ganancia de informacion", "random forest", "clase",
)
# Sin «hoja»/«raiz»/«rama»: también son términos de árboles de decisión.
BOTANY_TERMS = (
    "fotosintesis", "clorofila", "planta", "plantas", "estoma", "estomas", "savia",
    "xilema", "floema", "tronco", "follaje", "botanica", "semilla", "polen",
)
SECURITY_TERMS = (
    "privilegio", "privilegios", "rol", "roles", "grant", "revoke", "usuario", "usuarios",
    "auditoria", "autenticacion", "contrasena", "perfil", "permiso", "permisos",
    "cifrado", "acceso", "seguridad",
)
TRANSACTION_TERMS = ("transaccion", "transacciones", "commit", "rollback", "acid")
MIN_DISTINCT = 3  # términos distintos del tema que deben aparecer
MAX_STRAY_HITS = 1  # menciones tolerables de un término prohibido


def fold(text: str) -> str:
    nfd = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


_SCRIPT_STYLE = re.compile(r"<(script|style)\b[^>]*>.*?</\1\s*>", re.S | re.I)
_TAG = re.compile(r"<[^>]+>")
_ATTR = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')
_SKIP_ATTRS = {"class", "style", "d", "points", "transform", "viewbox", "href", "src", "id"}


def _attr_prose(tag: str) -> str:
    """Atributos con prosa (p. ej. `<upao-question prompt="…">`): llevan contenido real."""
    if re.match(r"<(meta|link)\b", tag, re.I):
        return ""
    out = []
    for name, value in _ATTR.findall(tag):
        if name.lower() in _SKIP_ATTRS or name.lower().startswith("data-"):
            continue
        value = htmllib.unescape(value)
        if len(value.split()) >= 2:
            out.append(value)
    return " ".join(out)


def html_to_text(raw: str) -> str:
    """Texto plano: sin script/style, con la prosa de atributos y entidades decodificadas."""
    raw = _SCRIPT_STYLE.sub(" ", raw or "")
    parts: list[str] = []
    pos = 0
    for m in _TAG.finditer(raw):
        parts.append(raw[pos : m.start()])
        parts.append(_attr_prose(m.group(0)))
        pos = m.end()
    parts.append(raw[pos:])
    text = htmllib.unescape(" ".join(parts))
    return re.sub(r"\s+", " ", text).strip()


def count_term(text: str, term: str) -> int:
    pat = r"(?<![a-z0-9])" + re.escape(fold(term)) + r"(?![a-z0-9])"
    return len(re.findall(pat, fold(text)))


def term_hits(text: str, terms: tuple[str, ...]) -> dict[str, int]:
    hits = {t: count_term(text, t) for t in terms}
    return {t: n for t, n in hits.items() if n}


def count_questions(raw_html: str) -> int:
    return len(re.findall(r"<upao-question\b", raw_html or ""))


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def check_no_forbidden(text: str, terms: tuple[str, ...], label: str) -> Check:
    hits = term_hits(text, terms)
    total = sum(hits.values())
    return Check(f"sin_{label}", total <= MAX_STRAY_HITS, f"menciones={hits or 0}")


def check_focus(
    text: str, wanted: tuple[str, ...], stray: tuple[str, ...], label: str, stray_label: str
) -> list[Check]:
    good, bad = term_hits(text, wanted), term_hits(text, stray)
    n_good, n_bad = sum(good.values()), sum(bad.values())
    return [
        Check(f"terminos_{label}", len(good) >= MIN_DISTINCT, f"distintos={len(good)} {good}"),
        Check(f"sin_foco_{stray_label}", n_bad <= n_good, f"{stray_label}={n_bad} vs {label}={n_good}"),
    ]


def check_scorm_zip(data: bytes | None, error: str | None = None) -> Check:
    if not data:
        return Check("scorm12", False, error or "no descargado")
    try:
        names = zipfile.ZipFile(io.BytesIO(data)).namelist()
    except Exception as exc:  # noqa: BLE001
        return Check("scorm12", False, f"zip inválido: {exc}")
    ok = "index.html" in names and any(n.startswith("resources/recurso_") for n in names)
    return Check("scorm12", ok, f"{len(names)} entradas")


@dataclass
class CaseSpec:
    key: str
    prompt: str
    area: str
    configs: dict = field(default_factory=dict)
    expect_questions: int | None = None


CASES = [
    CaseSpec("a_sin_area", "Fotosíntesis para secundaria", ""),
    CaseSpec("b_ml_arboles", "Árboles", "machine learning"),
    CaseSpec(
        "c_oracle_seguridad",
        "Seguridad",
        "Sistemas de gestión de bases de datos con Oracle",
        {"evaluate:1": {"num_questions": QUIZ_QUESTIONS}},
        QUIZ_QUESTIONS,
    ),
]


def content_checks(case: CaseSpec, text: str, quiz_html: str | None) -> list[Check]:
    checks: list[Check] = []
    if case.key.startswith(("a_", "b_")):
        checks.append(check_no_forbidden(text, FORBIDDEN_ORACLE, "oracle"))
    if case.key.startswith("b_"):
        checks += check_focus(text, TREE_TERMS, BOTANY_TERMS, "arboles", "botanica")
    if case.key.startswith("c_"):
        checks += check_focus(text, SECURITY_TERMS, TRANSACTION_TERMS, "seguridad", "transaccion")
    if case.expect_questions is not None:
        n = count_questions(quiz_html or "")
        checks.append(Check("quiz_preguntas", n == case.expect_questions, f"{n} (esperadas {case.expect_questions})"))
    return checks


# ── API / gasto ─────────────────────────────────────────────────────────────


def openrouter_usage(key: str) -> float | None:
    """Uso acumulado (USD) de la clave, o None si no se puede leer. No registra la clave."""
    import requests

    try:
        r = requests.get(
            "https://openrouter.ai/api/v1/key", headers={"Authorization": f"Bearer {key}"}, timeout=20
        )
        return float(r.json()["data"]["usage"])
    except Exception:  # noqa: BLE001
        return None


def set_area(admin: ApiClient, area: str) -> None:
    admin.put(
        "/api/admin/guardrails",
        {"guardrail_topic_area": area, "guardrail_topic_enabled": "1" if area else "0"},
    )


def fetch_contents(client: ApiClient, job: dict) -> list[dict]:
    out = []
    for r in job.get("resources", []):
        row = {"phase": r["phase_type"], "type": r["resource_type"], "status": r["status"], "html": ""}
        if r["status"] == "done":
            body = client.get(f"/api/jobs/{job['job_id']}/resources/{r['id']}/content")
            row["html"] = body.get("content", "")
        out.append(row)
    return out


def start_and_wait(user: ApiClient, case: CaseSpec, timeout_s: float, log=print) -> dict:
    """POST /api/jobs con resource_configs + poll con timeout duro."""
    started = user.post(
        "/api/jobs",
        {
            "prompt": case.prompt,
            "resources": RESOURCES,
            "theme": {"color": "upao", "design": "upao"},
            "resource_configs": case.configs,
        },
    )
    job_id, t0 = started["job_id"], time.monotonic()
    while True:
        job = user.get(f"/api/jobs/{job_id}")
        if job["status"] in _TERMINAL:
            return job
        if time.monotonic() - t0 > timeout_s:
            job["status"] = "hung"
            return job
        time.sleep(5)


def run_case(user: ApiClient, case: CaseSpec, timeout_s: float) -> dict:
    job = start_and_wait(user, case, timeout_s)
    rows = fetch_contents(user, job) if job.get("job_id") else []
    texts = [html_to_text(r["html"]) for r in rows]
    full = " ".join(texts)
    quiz = next((r["html"] for r in rows if r["phase"] == "evaluate"), None)
    done = sum(1 for r in rows if r["status"] == "done")
    checks = [Check("recursos_done", job["status"] == "done" and done == len(RESOURCES), f"job={job['status']} done={done}/{len(RESOURCES)}")]
    checks += content_checks(case, full, quiz)
    scorm = None
    scorm_err = None
    if job.get("ova_id"):
        try:
            scorm = user.download(f"/api/ovas/{job['ova_id']}/scorm")
        except Exception as exc:  # noqa: BLE001
            scorm_err = str(exc)[:200]
    checks.append(check_scorm_zip(scorm, scorm_err))
    return {"case": case, "job": job, "rows": rows, "texts": texts, "checks": checks}


def check_off_topic(user: ApiClient) -> Check:
    try:
        user.post("/api/jobs", {"prompt": "Fotosíntesis", "resources": RESOURCES})
    except ApiError as exc:
        ok = exc.status == 400 and "prompt_off_topic" in exc.body
        return Check("fuera_de_area_400", ok, f"status={exc.status}")
    return Check("fuera_de_area_400", False, "el job se creó (debía rechazarse con 400)")


def render_report(results: list[dict], extra: list[Check], spend: dict) -> str:
    lines = ["# QA con LLM real", ""]
    u0, u1 = spend.get("before"), spend.get("after")
    if u0 is not None and u1 is not None:
        lines.append(f"Gasto de la corrida: US${u1 - u0:.4f} (uso acumulado {u0:.4f} -> {u1:.4f}; tope US${BUDGET_USD:.2f})")
    else:
        lines.append("Gasto: no disponible (no se pudo leer /api/v1/key).")
    if spend.get("aborted"):
        lines.append("**ABORTADA: se superó el tope de gasto.**")
    lines.append("")
    for r in results:
        lines += [f"## {r['case'].key} — «{r['case'].prompt}» (área: {r['case'].area or 'ninguna'})", "",
                  "| Comprobación | Resultado | Detalle |", "|---|---|---|"]
        lines += [f"| {c.name} | {'OK' if c.ok else 'FALLA'} | {c.detail} |" for c in r["checks"]]
        lines.append("")
    if extra:
        lines += ["## Otras", "", "| Comprobación | Resultado | Detalle |", "|---|---|---|"]
        lines += [f"| {c.name} | {'OK' if c.ok else 'FALLA'} | {c.detail} |" for c in extra]
    return "\n".join(lines) + "\n"


def write_outputs(out: Path, results: list[dict], report: str) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "informe.md").write_text(report, "utf-8")
    for r in results:
        d = out / r["case"].key
        d.mkdir(exist_ok=True)
        for i, (row, text) in enumerate(zip(r["rows"], r["texts"], strict=False)):
            (d / f"{i}_{row['phase']}_{row['type']}.txt").write_text(text, "utf-8")
            (d / f"{i}_{row['phase']}_{row['type']}.html").write_text(row["html"], "utf-8")


def main() -> int:  # pragma: no cover - requiere backend real
    ap = argparse.ArgumentParser(prog="scripts.qa_llm_real", description=__doc__)
    ap.add_argument("--base-url", default="http://localhost:8000")
    ap.add_argument("--out-dir", default="qa-llm-real-out")
    ap.add_argument("--timeout-min", type=float, default=12.0)
    ap.add_argument("--admin-email", default=os.getenv("QA_ADMIN_EMAIL", "admin@genova.ai"))
    ap.add_argument("--admin-password", default=os.getenv("QA_ADMIN_PASSWORD", "admin1234password"))
    ap.add_argument("--email", default=os.getenv("QA_USER_EMAIL", "user@genova.ai"))
    ap.add_argument("--password", default=os.getenv("QA_USER_PASSWORD", "user1234password"))
    args = ap.parse_args()

    key = os.getenv("OPENROUTER_API_KEY", "")
    spend: dict = {"before": openrouter_usage(key) if key else None}
    admin, user = ApiClient(args.base_url), ApiClient(args.base_url)
    admin.login(args.admin_email, args.admin_password)
    user.login(args.email, args.password)

    results: list[dict] = []
    extra: list[Check] = []
    try:
        for case in CASES:
            set_area(admin, case.area)
            print(f"[caso] {case.key}", flush=True)
            results.append(run_case(user, case, args.timeout_min * 60))
            if case.key.startswith("b_"):
                extra.append(check_off_topic(user))  # área ML activa
            now = openrouter_usage(key) if key else None
            if now is not None and spend["before"] is not None and now - spend["before"] > BUDGET_USD:
                spend["aborted"] = True
                print("[gasto] tope superado, se aborta", flush=True)
                break
    finally:
        set_area(admin, "")
        spend["after"] = openrouter_usage(key) if key else None

    report = render_report(results, extra, spend)
    write_outputs(Path(args.out_dir), results, report)
    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(report)
    print(report)
    failed = spend.get("aborted") or any(not c.ok for r in results for c in r["checks"]) or any(not c.ok for c in extra)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
