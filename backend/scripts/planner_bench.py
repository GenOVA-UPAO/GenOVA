"""Bench reproducible del planner (qué 3 recursos 5E por fase) contra casos etiquetados.

Uso (desde backend/):
    .venv/bin/python scripts/planner_bench.py --cases <cases.json> [--strategies a,b] [--per-case]

Estrategias: fijo, laya-actual, llm, atributos (Laya :8090), atributos-8091 (Laya afinado),
atributos-kw (solo palabras clave, sin red), atributos-hibrido, atributos-hibrido-8091.
Métricas sobre los recursos elegidos: % recomendado, % aceptable o mejor, % inadecuado.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("OVA_DECISION_BACKEND", "laya")
os.environ.setdefault("LANGSMITH_TRACING", "false")

import logging  # noqa: E402

import structlog  # noqa: E402

structlog.configure(wrapper_class=structlog.make_filtering_bound_logger(logging.WARNING))

from ova_engine.planner import PHASES, plan_ova_global  # noqa: E402
from ova_engine.planner_attrs import plan_by_attributes  # noqa: E402

LAYA = os.getenv("BENCH_LAYA_URL", "http://localhost:8090")
LAYA_FT = os.getenv("BENCH_LAYA_FT_URL", "http://localhost:8091")
OLLAMA = os.getenv("BENCH_OLLAMA_URL", "http://localhost:11435")


def _llm_plan(tema: str) -> dict:
    import httpx

    from llm.utils.utils import parse_json
    from prometheus.nodes.concierge import _RESOURCE_CATALOG

    prompt = (
        f"Diseña la secuencia 5E para el concepto «{tema}» del curso Sistemas de Gestión de Base de Datos. "
        f"Elige exactamente 3 recursos por fase (IDs) que mejor enseñen ESE concepto.\n{_RESOURCE_CATALOG}\n"
        'Responde SOLO JSON: {"engage":[ids],"explore":[ids],"explain":[ids],"elaborate":[ids],"evaluate":[ids]}'
    )
    r = httpx.post(f"{OLLAMA}/api/chat", timeout=180, json={
        "model": "qwen3:8b", "stream": False, "think": False, "format": "json",
        "messages": [{"role": "user", "content": prompt}], "options": {"temperature": 0}})
    d = parse_json(r.json()["message"]["content"])
    return {p: [int(x) for x in d.get(p, [])][:3] for p in PHASES}


def _fixed(_tema: str) -> dict:
    from prometheus.nodes.concierge import _FALLBACK_PLAN

    return {p: ids[:3] for p, ids in _FALLBACK_PLAN.items()}


def _attrs(mode: str, url: str | None):
    return lambda tema: plan_by_attributes(tema, mode=mode, url=url)


STRATEGIES = {
    "fijo": _fixed,
    "laya-actual": lambda t: plan_ova_global(t),
    "llm": _llm_plan,
    "atributos": _attrs("laya", LAYA),
    "atributos-8091": _attrs("laya", LAYA_FT),
    "solo-prior": lambda t: __import__("ova_engine.planner_attrs", fromlist=["x"]).select_plan({}),
    "atributos-kw": _attrs("keywords", None),
    "atributos-hibrido": _attrs("hibrido", LAYA),
    "atributos-hibrido-8091": _attrs("hibrido", LAYA_FT),
}


def score(plan: dict, case: dict) -> dict:
    s = {"rec": 0, "ok": 0, "bad": 0, "n": 0}
    for p in PHASES:
        f = case["fases"][p]
        for rt in plan.get(p, []):
            s["n"] += 1
            s["rec"] += rt in f["recomendados"]
            s["ok"] += rt in f["recomendados"] or rt in f["aceptables"]
            s["bad"] += rt in f["inadecuados"]
    return s


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", required=True)
    ap.add_argument("--strategies", default=",".join(STRATEGIES))
    ap.add_argument("--per-case", action="store_true")
    ap.add_argument("--llm-cache", help="json para cachear los planes del LLM entre ejecuciones")
    ap.add_argument("--out", help="json de resultados")
    args = ap.parse_args()
    cases = json.loads(Path(args.cases).read_text())["cases"]
    cache = json.loads(Path(args.llm_cache).read_text()) if args.llm_cache and Path(args.llm_cache).exists() else {}
    out = {}
    for name in args.strategies.split(","):
        fn = STRATEGIES[name]
        tot = {"rec": 0, "ok": 0, "bad": 0, "n": 0}
        times = []
        for c in cases:
            t0 = time.time()
            if name == "llm" and str(c["id"]) in cache:
                plan = cache[str(c["id"])]
            else:
                plan = fn(c["tema"]) or {}
                if name == "llm":
                    cache[str(c["id"])] = plan
            times.append(time.time() - t0)
            sc = score(plan, c)
            for k, v in sc.items():
                tot[k] += v
            if args.per_case:
                n = sc["n"] or 1
                print(f"  [{name}] {c['id']:>3} rec {sc['rec']/n*100:4.0f}% bad {sc['bad']/n*100:4.0f}%  {c['tema'][:55]}")
        n = tot["n"] or 1
        out[name] = {
            "recomendado": round(tot["rec"] / n * 100, 1),
            "aceptable_o_mejor": round(tot["ok"] / n * 100, 1),
            "inadecuado": round(tot["bad"] / n * 100, 1),
            "p50_s": round(statistics.median(times), 2),
        }
        o = out[name]
        print(f"{name:24s} rec {o['recomendado']:5}% | aceptable+ {o['aceptable_o_mejor']:5}% | "
              f"inadecuado {o['inadecuado']:5}% | p50 {o['p50_s']}s", flush=True)
    if args.llm_cache:
        Path(args.llm_cache).write_text(json.dumps(cache))
    if args.out:
        Path(args.out).write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
