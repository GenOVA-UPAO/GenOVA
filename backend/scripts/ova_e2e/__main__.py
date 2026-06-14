"""CLI del harness E2E de OVAs (driver HTTP contra el backend en Docker).

Uso (lo invoca normalmente ``scripts/ova-e2e.ps1``):

    python -m scripts.ova_e2e --prompt "Regresión lineal simple" \
        --profiles default,openrouter --timeout-min 8 --out-dir <dir>

Login → sube doc RAG una vez → por cada perfil: aplica modelos, genera el OVA,
verifica el flujo y vuelca una carpeta navegable. Exit ≠0 si algún perfil se
colgó o falló una asercion dura.
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

# La consola Windows (cp1252) no codifica los simbolos del reporte (→, ⚠).
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from scripts.ova_e2e import flow, output, profiles, verify  # noqa: E402
from scripts.ova_e2e.client import ApiClient  # noqa: E402
from scripts.ova_e2e.rag_fixture import make_sample_pdf  # noqa: E402
from scripts.ova_e2e.uploads import ingest  # noqa: E402

_MIME = {".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg",
         ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="scripts.ova_e2e", description=__doc__)
    p.add_argument("--prompt", required=True)
    p.add_argument("--profiles", default="default,openrouter")
    p.add_argument("--resources", default=None, help='ej. "engage:1,explore:4,..."')
    p.add_argument("--llm-config", default=None, help="JSON para perfil custom")
    p.add_argument("--upload-file", default=None, help="PDF/imagen real para RAG")
    p.add_argument("--no-rag", action="store_true")
    p.add_argument("--base-url", default="http://localhost:8000")
    p.add_argument("--timeout-min", type=float, default=8.0)
    p.add_argument("--email", default="user@genova.ai")
    p.add_argument("--password", default="user1234password")
    p.add_argument("--out-dir", default=None)
    p.add_argument("--color", default="upao", choices=("upao", "free"))
    p.add_argument("--design", default="upao", choices=("upao", "free"))
    return p.parse_args()


def _rag_file(args) -> tuple[str, bytes, str]:
    if args.upload_file:
        path = Path(args.upload_file)
        mime = _MIME.get(path.suffix.lower(), "application/pdf")
        return path.name, path.read_bytes(), mime
    return "sample.pdf", make_sample_pdf(args.prompt), "application/pdf"


def main() -> int:
    args = _parse_args()
    # IMPORTANTE: fuera de backend/ — ese dir está montado con uvicorn --reload en
    # Docker, y escribir ahí dispara reloads que matan el thread de generación.
    out_root = Path(args.out_dir) if args.out_dir else (
        _BACKEND_ROOT.parent / "test-output" / datetime.now().strftime("%Y-%m-%d_%H%M%S")
    )
    out_root.mkdir(parents=True, exist_ok=True)
    log_path = out_root / "backend.log"

    client = ApiClient(args.base_url)
    client.login(args.email, args.password)
    print(f"[auth] login {args.email} ok", flush=True)

    upload_ids: list[str] = []
    rag_summary = None
    rag_file = None
    if not args.no_rag:
        fname, fbytes, mime = _rag_file(args)
        rag_file = (fname, fbytes)
        upload_ids, rag_summary = ingest(client, fbytes, fname, mime)

    resources = flow.default_resources(args.resources)
    theme = {"color": args.color, "design": args.design}
    timeout_s = args.timeout_min * 60

    summaries = []
    failed = False
    for name in [p.strip() for p in args.profiles.split(",") if p.strip()]:
        print(f"\n=== perfil: {name} ===", flush=True)
        prof = profiles.apply(client, name, args.llm_config)
        for w in prof.warnings:
            print(f"⚠ {w}", flush=True)
        result = flow.run_flow(client, args.prompt, resources, theme, upload_ids, timeout_s)
        backend_log = log_path.read_text("utf-8", "replace") if log_path.exists() else None
        checks = verify.verify(result, resources, rag_summary, backend_log)
        summary = output.write_profile(
            out_root / name, prof, result, checks, resources, rag_summary, rag_file
        )
        summaries.append(summary)
        if result.hung or any(c["ok"] is False for c in checks):
            failed = True
        print(f"[verify] {summary['passed']}/{summary['total']} aserciones OK", flush=True)

    output.write_index(out_root, args.prompt, summaries)
    print("\nRESUMEN")
    for s in summaries:
        r = s["report"]
        print(f"  {s['profile']:<11} job={r['job_status']} hung={r['hung']} "
              f"{s['passed']}/{s['total']} ok", flush=True)
    print(f"salida → {out_root}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
