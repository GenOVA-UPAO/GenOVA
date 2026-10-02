"""Renderiza el `sample` de cada plantilla de ova_engine a HTML (revisión visual).

    python scripts/ova_engine_render.py OUT_DIR [fase[:rt] ...]

Después: servir OUT_DIR (python -m http.server) y revisar con playwright-cli
(consola sin errores, interacción completa → upao-complete desbloqueado).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ova_engine.pipeline import render_resource  # noqa: E402
from ova_engine.registry import all_specs  # noqa: E402


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    filters = sys.argv[2:]
    for key, spec in sorted(all_specs().items()):
        if filters and not any(key == f or key.startswith(f + ":") for f in filters):
            continue
        params = spec.resolve_params({})
        html = render_resource(spec, spec.sample("Índices B-tree", params), "Índices B-tree", params)
        path = out / f"{spec.phase}_{spec.rt:02d}.html"
        path.write_text(html, encoding="utf-8")
        print(path)


if __name__ == "__main__":
    main()
