"""Reproducible benchmark; preserve raw answers alongside deterministic repairs.

Run from backend with the shared Python environment. --snapshots is an explicit
developer operation, not a pytest auto-update. Review is recorded separately.
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import os
import sys
import time
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from llm.images.sources.contract import DIAGRAM_SCHEMA, ImageRequest  # noqa: E402
from llm.images.sources.diagram import DiagramSource, _matches, valid_diagram  # noqa: E402
from llm.images.sources.diagram_generation import generate_diagram_json  # noqa: E402

CASES = [
    (
        "er",
        "Modelo ER de una biblioteca",
        "Libro, Ejemplar, Usuario y Préstamo; un libro tiene varios ejemplares; préstamo enlaza usuario y ejemplar; PK/FK y cardinalidades.",
    ),
    (
        "er",
        "Modelo ER de una tienda",
        "Cliente, Pedido, Detalle y Producto; detalle resuelve N:M; PK/FK y cardinalidades.",
    ),
    (
        "er",
        "Modelo ER de matrícula",
        "Estudiante, Curso y Matrícula; matrícula resuelve N:M; PK/FK y cardinalidades.",
    ),
    (
        "arbol",
        "B-Tree de orden 4",
        "Máximo 3 claves por nodo y 4 hijos; raíz [20,40], hojas [5,10], [25,30], [50,60]; rangos correctos, misma profundidad.",
    ),
    (
        "arbol",
        "Árbol binario de búsqueda",
        "Raíz 8; hijos 3 y 10; 3 tiene hijos 1 y 6; menor a la izquierda, mayor a la derecha. Ordena nodos por izquierda/derecha.",
    ),
    (
        "arbol",
        "Jerarquía de archivos",
        "Raíz /; directorios home y etc; home tiene usuario y usuario tiene documentos. Un solo padre por nodo.",
    ),
    (
        "flujo",
        "Normalización 1FN a 3FN",
        "1FN valores atómicos; 2FN elimina dependencias parciales; 3FN elimina dependencias transitivas de atributos no clave; progresión ordenada.",
    ),
    (
        "flujo",
        "Flujo de una consulta SQL",
        "Análisis sintáctico, validación semántica, optimización, ejecución y resultados; orden correcto.",
    ),
    (
        "flujo",
        "Búsqueda binaria",
        "Intervalo ordenado, punto medio, comparar, reducir mitad o devolver; aristas condicionales, ciclo de repetición y caso no encontrado.",
    ),
    (
        "flujo",
        "Ciclo de compilación",
        "Código fuente, análisis léxico, sintáctico, semántico, optimización, generación de código; orden correcto.",
    ),
    (
        "capas",
        "Arquitectura cliente-servidor",
        "Cliente navegador, servidor API, base de datos; responsabilidades y comunicación; grupos cliente, servidor, datos.",
    ),
    (
        "capas",
        "Capas del modelo OSI",
        "Siete capas de arriba abajo: aplicación, presentación, sesión, transporte, red, enlace y física; función de cada capa.",
    ),
    (
        "capas",
        "Arquitectura de tres capas",
        "Presentación, lógica de negocio y acceso a datos; separación de responsabilidades; cada nodo en su grupo.",
    ),
    (
        "secuencia",
        "TCP three-way handshake",
        "Solo dos actores Cliente y Servidor; aristas ordenadas: Cliente→Servidor SYN, Servidor→Cliente SYN-ACK, Cliente→Servidor ACK.",
    ),
    (
        "secuencia",
        "Consulta DNS",
        "Actores Cliente, Resolutor y Servidor autoritativo; consulta, resolución y respuestas en orden; simplificación con caché vacía.",
    ),
    (
        "secuencia",
        "Petición HTTP",
        "Dos actores navegador y servidor; solicitud GET del navegador y respuesta HTTP 200 del servidor; orden y dirección.",
    ),
    (
        "comparacion",
        "SQL vs NoSQL",
        "Dos columnas SQL y NoSQL; modelo, esquema, consultas y escalabilidad; no afirmar que NoSQL carece siempre de transacciones.",
    ),
    (
        "comparacion",
        "TCP vs UDP",
        "Dos columnas TCP y UDP; conexión, fiabilidad, orden y casos de uso; UDP no garantiza entrega u orden.",
    ),
    (
        "er",
        "Modelo ER de un hospital",
        "Paciente, Médico y Cita; cita enlaza un paciente y un médico; PK/FK y cardinalidades.",
    ),
    (
        "arbol",
        "Árbol de expresión aritmética",
        "Expresión (a+b)*c; raíz *, hijos + y c; + tiene hijos a y b; un padre por nodo, orden de operandos.",
    ),
]

EXAMPLE = {
    "tipo": "flujo",
    "titulo": "Procesamiento",
    "nodos": [{"id": "a", "etiqueta": "Entrada"}, {"id": "b", "etiqueta": "Salida"}],
    "aristas": [{"origen": "a", "destino": "b", "etiqueta": "procesar"}],
}


def prompt_for(kind, concept, criteria):
    example = deepcopy(EXAMPLE)
    example["tipo"] = kind
    example["nodos"][0]["etiqueta"] = "Elemento Alfa"
    example["nodos"][1]["etiqueta"] = "Elemento Beta"
    example["aristas"][0]["etiqueta"] = "relación"
    example["nodos"][0]["atributos"] = ["Propiedad breve"]
    rules = {
        "er": "Atributos SOLO nombres con marcas (PK)/(FK), sin explicaciones ni '(completo)'. PK en cada entidad. Cardinalidad 1:1, 1:N, N:1 o N:M relativa a origen→destino; la FK va en el lado N. No dupliques FK existentes aunque usen id_x, x_id, xId, idX o sufijos de rol. Entidad intermedia para N:M. Relaciones de roles distintos conservan sus etiquetas, incluso entre las mismas entidades. No emitas cardinalidades contradictorias ni entidades ajenas al concepto solicitado.",
        "arbol": "Solo nodos necesarios. Un padre por nodo. Hermanos y aristas en orden izquierda→derecha. En B-Tree etiqueta SOLO [claves,numéricas], sin atributos; respeta rangos y profundidad uniforme. En BST etiqueta SOLO número.",
        "flujo": "Solo etapas necesarias. Cada arista expresa la condición o acción que permite ir del origen al destino, no un resultado aún no obtenido. Decisiones con salidas sí/no o condiciones mutuamente excluyentes; bucles vuelven a evaluar la condición y tienen salida. Incluye todas las transiciones solicitadas, incluidas las de fallo en ciclos de estado. Recalcula en cada iteración.",
        "capas": "Nodos ordenados arriba→abajo, grupo y atributos describen función de cada capa.",
        "secuencia": "Nodos SOLO actores únicos por etiqueta; reutiliza el mismo ID para cada aparición del actor. Aristas SOLO mensajes, en orden temporal. No crear nodos de mensajes.",
        "comparacion": "EXACTAMENTE dos nodos. Atributos con formato 'Criterio: valor', mismos criterios neutrales y precisos en ambos nodos, máximo 5. Si el detalle pide criterios, usa exclusivamente esos criterios y no añadas otros. Omite cualquier criterio cuyo valor no sepas con certeza para ambas alternativas. Evita absolutos, dicotomías inventadas o juicios de superioridad.",
    }
    if kind == "er":
        example["nodos"][0]["atributos"] = ["id (PK)"]
        example["nodos"][1]["atributos"] = ["id (PK)", "elemento_alfa_id (FK)"]
        example["aristas"][0]["cardinalidad"] = "1:N"
    elif kind == "flujo":
        example["titulo"] = "Ciclo abstracto"
        example["nodos"] = [
            {"id": "a", "etiqueta": "Inicio"},
            {"id": "b", "etiqueta": "¿Condición pendiente?"},
            {"id": "c", "etiqueta": "Acción abstracta"},
            {"id": "d", "etiqueta": "Fin"},
        ]
        example["aristas"] = [
            {"origen": "a", "destino": "b", "etiqueta": "evaluar"},
            {"origen": "b", "destino": "c", "etiqueta": "sí"},
            {"origen": "b", "destino": "d", "etiqueta": "no"},
            {"origen": "c", "destino": "b", "etiqueta": "reevaluar"},
        ]
    elif kind == "capas":
        example["nodos"][0]["grupo"] = "Capa A"
        example["nodos"][1]["grupo"] = "Capa B"
    elif kind == "comparacion":
        example["nodos"][0]["atributos"] = ["Propiedad: valor alfa"]
        example["nodos"][1]["atributos"] = ["Propiedad: valor beta"]
        example["aristas"] = []
    return (
        f"Diagrama en español de {concept}. tipo DEBE ser {kind}. {criteria} {rules[kind]} "
        "IDs únicos; referencias existentes. Etiquetas cortas (máx 24 caracteres); "
        "explicaciones en atributos separados, cortos y completos (máx 35 caracteres). "
        "No trunques frases. Solo JSON, sin HTML. "
        "No incluyas contadores ni derivados (Hijos: 2, grado, nivel, altura): los calcula el renderizador. "
        "Cardinalidad exclusivamente en ER, nunca en mensajes ni otros tipos. Titulo específico del concepto. "
        "El ejemplo siguiente SOLO ilustra estructura abstracta: no copies sus nodos ni propiedades al resultado. "
        + json.dumps(example, ensure_ascii=False)
    )


def evaluate(out: Path, *, resume: bool = False, cases=None, model: str | None = None):
    os.environ.setdefault("OVA_LOCAL_LLM_URL", "http://localhost:11435")
    records = json.loads((out / "resultados.json").read_text()) if resume else []
    for index, (kind, concept, criteria) in enumerate(cases if cases is not None else CASES, 1):
        if any(record["id"] == index for record in records):
            continue
        prompt = prompt_for(kind, concept, criteria)
        start = time.perf_counter()
        raw, actual_model = generate_diagram_json(prompt, model=model)
        seconds = time.perf_counter() - start
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = None
        begin = time.perf_counter()
        result = DiagramSource().fetch(
            ImageRequest("diagrama", concept + ". " + criteria, diagrama=data)
        )
        render_ms = (time.perf_counter() - begin) * 1000
        record = {
            "id": index,
            "tipo": kind,
            "concepto": concept,
            "criterios": criteria,
            "prompt": prompt,
            "raw": raw,
            "model": actual_model,
            "diagrama": data,
            "schema_valid": _matches(data, DIAGRAM_SCHEMA),
            "graph_valid": valid_diagram(data),
            "tipo_correcto": isinstance(data, dict) and data.get("tipo") == kind,
            "seconds": round(seconds, 3),
            "render_ms": round(render_ms, 3),
            "meta": result.meta if result else None,
            "accepted": result is not None,
        }
        if result:
            (out / f"{index:02}.svg").write_bytes(
                base64.b64decode(result.data_uri.split(",", 1)[1])
            )
        records.append(record)
        (out / "resultados.json").write_text(json.dumps(records, ensure_ascii=False, indent=2))
        print(
            f"{index:02} {kind} {concept}: schema={record['schema_valid']} graph={record['graph_valid']} {seconds:.2f}s",
            flush=True,
        )
    gallery(out)


def gallery(out: Path, source: Path | None = None):
    source = source or out
    records = json.loads((source / "resultados.json").read_text())
    cards = []
    for record in records:
        svg_path = source / f"{record['id']:02}.svg"
        svg = svg_path.read_text() if svg_path.exists() else "<p>Rechazado por la fuente</p>"
        # Standalone SVG IDs are local; inline gallery SVGs need document-unique IDs.
        for name in ("title", "desc", "arrow"):
            svg = svg.replace(f'id="{name}"', f'id="{name}-{record["id"]}"')
        svg = svg.replace(
            'aria-labelledby="title desc"',
            f'aria-labelledby="title-{record["id"]} desc-{record["id"]}"',
        )
        svg = svg.replace("url(#arrow)", f"url(#arrow-{record['id']})")
        cards.append(
            f'<article id="caso-{record["id"]}"><h2>{record["id"]:02}. {html.escape(record["concepto"])}</h2>'
            f"<p>{record['tipo']} · LLM {record['seconds']} s · SVG {record['render_ms']} ms</p>"
            f'<div class="diagram">{svg}</div></article>'
        )
    document = (
        '<!doctype html><html lang="es"><meta charset="utf-8"><title>Galería de diagramas GenOVA</title>'
        "<style>body{font:16px system-ui;background:#F5F8FC;color:#172B4D;margin:24px}"
        "h1{color:#0A3D91}article{background:white;border:2px solid #0A3D91;border-radius:12px;"
        "padding:20px;margin:24px 0}h2{font-size:22px}.diagram{overflow:auto}"
        "svg{display:block;max-width:100%;height:auto}p{font-size:14px}</style>"
        f"<h1>{len(records)} diagramas técnicos · SVG determinista v3</h1>"
        "<p>JSON original registrado y reparaciones automáticas trazables en meta.diagrama.</p>"
        + "".join(cards)
        + "</html>"
    )
    (out / "galeria.html").write_text(document)


def rerender(out: Path):
    """Recheck the same raw responses after renderer fixes, without new LLM sampling."""
    records = json.loads((out / "resultados.json").read_text())
    for record in records:
        start = time.perf_counter()
        result = DiagramSource().fetch(
            ImageRequest(
                "diagrama",
                record["concepto"] + ". " + record["criterios"],
                diagrama=record["diagrama"],
            )
        )
        record.setdefault("first_render_ms", record["render_ms"])
        record["render_ms"] = round((time.perf_counter() - start) * 1000, 3)
        record["meta"] = result.meta if result else None
        record["accepted"] = result is not None
        path = out / f"{record['id']:02}.svg"
        if result:
            path.write_bytes(base64.b64decode(result.data_uri.split(",", 1)[1]))
        elif path.exists():
            path.unlink()
    (out / "resultados.json").write_text(json.dumps(records, ensure_ascii=False, indent=2))
    gallery(out)


def snapshots():
    from tests.test_diagram_source import KINDS, SNAPSHOTS, fixture, render

    SNAPSHOTS.mkdir(parents=True, exist_ok=True)
    for kind in KINDS:
        (SNAPSHOTS / f"{kind}.svg").write_text(render(fixture(kind))[1])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path)
    parser.add_argument("--snapshots", action="store_true")
    parser.add_argument("--gallery", action="store_true")
    parser.add_argument("--gallery-source", type=Path)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument(
        "--render", action="store_true", help="Revalidar respuestas registradas sin llamar al LLM"
    )
    parser.add_argument("--cases", type=Path, help="JSON [[tipo, concepto, detalle], …]")
    parser.add_argument("--model", help="Modelo Ollama o ID OpenRouter; también OVA_DIAGRAM_MODEL")
    args = parser.parse_args()
    if args.snapshots:
        snapshots()
    elif args.render:
        rerender(args.out)
    elif args.gallery:
        gallery(args.out, args.gallery_source)
    else:
        args.out.mkdir(parents=True, exist_ok=True)
        cases = json.loads(args.cases.read_text()) if args.cases else None
        if cases is not None and (
            not isinstance(cases, list)
            or not cases
            or any(
                not isinstance(case, list)
                or len(case) != 3
                or not all(isinstance(v, str) for v in case)
                or case[0] not in DIAGRAM_SCHEMA["properties"]["tipo"]["enum"]
                for case in cases
            )
        ):
            parser.error("--cases requiere una lista no vacía de [tipo, concepto, detalle]")
        evaluate(args.out, resume=args.resume, cases=cases, model=args.model)
