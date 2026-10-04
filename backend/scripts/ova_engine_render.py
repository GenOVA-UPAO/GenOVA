"""Renderiza el `sample` de cada plantilla de ova_engine a HTML (revisión visual).

    python scripts/ova_engine_render.py OUT_DIR [--fixtures] [fase[:rt] ...]

Con --fixtures usa las fixtures grabadas (tests/fixtures/ova_engine/*.json, texto
real de LLM) en lugar del `sample`.

Después: servir OUT_DIR (python -m http.server) y revisar con playwright-cli
(consola sin errores, interacción completa → upao-complete desbloqueado).
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ova_engine.pipeline import render_resource  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402

FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "ova_engine"


def main() -> None:
    args = sys.argv[1:]
    use_fixtures = "--fixtures" in args
    args = [a for a in args if a != "--fixtures"]
    out = Path(args[0])
    out.mkdir(parents=True, exist_ok=True)
    filters = args[1:]
    for key, spec in sorted(all_specs().items()):
        if filters and not any(key == f or key.startswith(f + ":") for f in filters):
            continue
        if use_fixtures:
            fx_path = FIXTURES / f"{spec.phase}_{spec.rt:02d}.json"
            if not fx_path.exists():
                continue
            fx = json.loads(fx_path.read_text(encoding="utf-8"))
            concept, params, data = fx["concept"], fx["params"], fx["data"]
        else:
            concept = "Índices B-tree"
            params = spec.resolve_params({})
            data = spec.sample(concept, params)
        html = render_resource(spec, data, concept, params)
        path = out / f"{spec.phase}_{spec.rt:02d}.html"
        path.write_text(html, encoding="utf-8")
        print(path)


if __name__ == "__main__":
    main()
