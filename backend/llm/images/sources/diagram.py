"""Diagramas SVG offline: texto escapado, geometría determinista y sin dependencias.

El lienzo crece con el contenido; width/height son preferencias de presentación,
no restricciones que obliguen a comprimir texto. Las etiquetas de conexiones se
reservan en carriles propios. El único fragmento URI es el marcador SVG local.
"""

from __future__ import annotations

import base64
import textwrap
from dataclasses import dataclass
from xml.sax.saxutils import escape, quoteattr

from llm.images.sources.contract import DIAGRAM_SCHEMA, ImageRequest, ImageResult

BLUE = "#0A3D91"
ORANGE = "#F58220"
INK = "#172B4D"
BACKGROUND = "#F5F8FC"
WHITE = "#FFFFFF"


def _xml_text(value: str) -> bool:
    return all(
        c in "\t\n\r"
        or 0x20 <= ord(c) <= 0xD7FF
        or 0xE000 <= ord(c) <= 0xFFFD
        or 0x10000 <= ord(c) <= 0x10FFFF
        for c in value
    )


def _matches(data, schema: dict) -> bool:
    """Exact subset used by DIAGRAM_SCHEMA (including additionalProperties)."""
    kind = schema.get("type")
    types = {"object": dict, "array": list, "string": str}
    if kind and not isinstance(data, types[kind]):
        return False
    if "enum" in schema and data not in schema["enum"]:
        return False
    if kind == "string":
        return len(data) <= schema.get("maxLength", 10000) and _xml_text(data)
    if kind == "array":
        return schema.get("minItems", 0) <= len(data) <= schema.get("maxItems", 100) and all(
            _matches(item, schema["items"]) for item in data
        )
    if kind == "object":
        props = schema["properties"]
        return (
            all(key in data for key in schema.get("required", []))
            and (schema.get("additionalProperties", True) or data.keys() <= props.keys())
            and all(_matches(value, props[key]) for key, value in data.items() if key in props)
        )
    return True


def valid_diagram(data) -> bool:
    """Strict schema + nonempty IDs/labels + references + bounded tree semantics."""
    if not _matches(data, DIAGRAM_SCHEMA):
        return False
    nodes, edges = data["nodos"], data.get("aristas", [])
    ids = [node["id"] for node in nodes]
    if len(set(ids)) != len(ids) or any(not value.strip() for value in ids):
        return False
    if any(not node["etiqueta"].strip() for node in nodes):
        return False
    if any(edge["origen"] not in ids or edge["destino"] not in ids for edge in edges):
        return False
    if data["tipo"] == "arbol":
        parents = [edge["destino"] for edge in edges]
        return len(parents) == len(set(parents)) and _levels(nodes, edges) is not None
    return True


def _levels(nodes: list[dict], edges: list[dict]) -> dict[str, int] | None:
    remaining = {node["id"] for node in nodes}
    levels: dict[str, int] = {}
    while remaining:
        ready = [
            node["id"]
            for node in nodes
            if node["id"] in remaining
            and all(e["origen"] in levels for e in edges if e["destino"] == node["id"])
        ]
        if not ready:
            return None
        for node_id in ready:
            levels[node_id] = max(
                (levels[e["origen"]] + 1 for e in edges if e["destino"] == node_id), default=0
            )
            remaining.remove(node_id)
    return levels


def _lines(value: str, length: int = 22) -> list[str]:
    # Conservative bound: even the widest system-font glyph fits in the box.
    return textwrap.wrap(" ".join(value.split()), length, break_long_words=True) or [""]


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    width: int
    height: int


class Canvas:
    def __init__(self):
        self.parts: list[str] = []

    def text(self, x: int, y: int, value: str, *, bold: bool = False, length: int = 22):
        for index, line in enumerate(_lines(value, length)):
            self.parts.append(
                f'<text x="{x}" y="{y + index * 22}" fill="{INK}" font-size="16"'
                f' font-weight="{700 if bold else 400}">{escape(line)}</text>'
            )

    def rect(self, box: Box, fill: str = WHITE, stroke: str = BLUE):
        self.parts.append(
            f'<rect x="{box.x}" y="{box.y}" width="{box.width}" height="{box.height}"'
            f' rx="8" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        )

    def path(self, points: str, *, arrow: bool = True, dashed: bool = False):
        marker = ' marker-end="url(#arrow)"' if arrow else ""
        dash = ' stroke-dasharray="6 6"' if dashed else ""
        self.parts.append(
            f'<path d="{points}" fill="none" stroke="{BLUE}" stroke-width="2"{marker}{dash}/>'
        )


def _node_height(node: dict) -> int:
    return 36 + 22 * sum(len(_lines(value)) for value in _node_values(node))


def _node_values(node: dict) -> list[str]:
    return [
        node["etiqueta"],
        *([node["grupo"]] if node.get("grupo") else []),
        *node.get("atributos", []),
    ]


def _draw_node(canvas: Canvas, node: dict, box: Box):
    canvas.rect(box)
    canvas.parts.append(
        f'<path d="M {box.x + 12} {box.y + 9} H {box.x + box.width - 12}"'
        f' stroke="{ORANGE}" stroke-width="4"/>'
    )
    y = box.y + 32
    for index, value in enumerate(_node_values(node)):
        canvas.text(box.x + 16, y, value, bold=index == 0)
        y += 22 * len(_lines(value))


def _edge_label(edge: dict) -> str:
    return " · ".join(filter(None, [edge.get("etiqueta", ""), edge.get("cardinalidad", "")]))


def _column_layout(data: dict) -> tuple[dict[str, Box], int, int]:
    """ER/flow/layers: stacked boxes, explicit right-side connection lanes."""
    nodes = data["nodos"]
    if data["tipo"] == "capas":
        # Stable grouping: first occurrence defines the order of the layers.
        groups = list(dict.fromkeys(node.get("grupo", "") for node in nodes))
        nodes = [node for group in groups for node in nodes if node.get("grupo", "") == group]
    boxes = {}
    y = 150
    for node in nodes:
        degree = sum(
            (node["id"] == e["origen"]) + (node["id"] == e["destino"])
            for e in data.get("aristas", [])
        )
        height = max(_node_height(node), 40 + degree * 60)
        boxes[node["id"]] = Box(36, y, 390, height)
        y += height + 48
    return boxes, 890 + 28 * len(data.get("aristas", [])), y


def _column_edges(canvas: Canvas, data: dict, boxes: dict[str, Box]):
    ports = dict.fromkeys(boxes, 0)
    for index, edge in enumerate(data.get("aristas", [])):
        source, target = boxes[edge["origen"]], boxes[edge["destino"]]
        sy = source.y + 30 + ports[edge["origen"]] * 60
        ports[edge["origen"]] += 1
        ty = target.y + 30 + ports[edge["destino"]] * 60
        ports[edge["destino"]] += 1
        rail = 850 + index * 28
        canvas.path(f"M 426 {sy} H {rail} V {ty} H 432", arrow=data["tipo"] != "er")
        label = _edge_label(edge)
        if label:
            canvas.rect(Box(444, sy - 20, 370, 48), BACKGROUND, BACKGROUND)
            canvas.text(452, sy - 2, label)


def _tree_layout(data: dict) -> tuple[dict[str, Box], int, int]:
    levels = _levels(data["nodos"], data.get("aristas", []))
    assert levels is not None
    boxes = {}
    y = 150
    width = 480
    for level in range(max(levels.values()) + 1):
        nodes = [node for node in data["nodos"] if levels[node["id"]] == level]
        height = max(_node_height(node) for node in nodes)
        for index, node in enumerate(nodes):
            boxes[node["id"]] = Box(36 + index * 430, y, 390, height)
        width = max(width, len(nodes) * 430 + 36)
        y += height + 120 + 60 * len(data.get("aristas", []))
    return boxes, width + 390, y


def _tree_edges(canvas: Canvas, data: dict, boxes: dict[str, Box]):
    for index, edge in enumerate(data.get("aristas", [])):
        a, b = boxes[edge["origen"]], boxes[edge["destino"]]
        lane = a.y + a.height + 50 + index * 60
        ax, bx = a.x + a.width // 2, b.x + b.width // 2
        canvas.path(f"M {ax} {a.y + a.height} V {lane} H {bx} V {b.y - 6}")
        if label := _edge_label(edge):
            canvas.rect(Box(min(ax, bx) + 8, lane - 44, 370, 48), BACKGROUND, BACKGROUND)
            canvas.text(min(ax, bx) + 16, lane - 26, label)


def _comparison(canvas: Canvas, data: dict) -> tuple[int, int, dict]:
    nodes = data["nodos"]
    height = max(_node_height(node) for node in nodes)
    boxes = {
        node["id"]: Box(36 + index * 430, 150, 390, height) for index, node in enumerate(nodes)
    }
    for node in nodes:
        _draw_node(canvas, node, boxes[node["id"]])
    y = 150 + height + 70
    for edge in data.get("aristas", []):
        a, b = boxes[edge["origen"]], boxes[edge["destino"]]
        ax, bx = a.x + 195, b.x + 195
        canvas.path(f"M {ax} {150 + height} V {y} H {bx} V {150 + height + 6}")
        canvas.text(36, y + 28, _edge_label(edge))
        y += 100
    return 36 + len(nodes) * 430, y + 50, boxes


def _sequence(canvas: Canvas, data: dict) -> tuple[int, int, dict]:
    nodes, edges = data["nodos"], data.get("aristas", [])
    height = max(_node_height(node) for node in nodes)
    boxes = {
        node["id"]: Box(36 + index * 430, 150, 390, height) for index, node in enumerate(nodes)
    }
    bottom = 150 + height + 100 * (len(edges) + 1)
    for node in nodes:
        box = boxes[node["id"]]
        _draw_node(canvas, node, box)
        x = box.x + 195
        canvas.path(f"M {x} {box.y + height} V {bottom}", arrow=False, dashed=True)
    for index, edge in enumerate(edges):
        ax, bx = boxes[edge["origen"]].x + 195, boxes[edge["destino"]].x + 195
        y = 150 + height + 100 * (index + 1)
        points = f"M {ax} {y} H {bx}"
        if ax == bx:
            points = f"M {ax} {y} h 180 v 45 H {ax + 6}"
        canvas.path(points)
        canvas.text(min(ax, bx) + 12, y - 52, f"{index + 1}. {_edge_label(edge)}")
    return 36 + 430 * len(nodes), bottom + 40, boxes


def _render(data: dict, description: str) -> tuple[str, dict]:
    canvas = Canvas()
    kind = data["tipo"]
    if kind in ("secuencia", "comparacion"):
        width, height, boxes = (_sequence if kind == "secuencia" else _comparison)(canvas, data)
    else:
        boxes, width, height = (_tree_layout if kind == "arbol" else _column_layout)(data)
        (_tree_edges if kind == "arbol" else _column_edges)(canvas, data, boxes)
        for node in data["nodos"]:
            _draw_node(canvas, node, boxes[node["id"]])
    title = data.get("titulo") or "Diagrama técnico"
    canvas.text(36, 30, title, bold=True, length=22)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"'
        f' viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc" lang="es"'
        ' font-family="system-ui, sans-serif">'
        f'<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>'
        '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"'
        ' markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M 0 0 L 10 5 L 0 10 z" fill="{BLUE}"/></marker></defs>'
        f'<rect width="100%" height="100%" fill={quoteattr(BACKGROUND)}/>'
        + "".join(canvas.parts)
        + "</svg>"
    )
    return svg, {
        "tipo": kind,
        "width": width,
        "height": height,
        "boxes": {key: [b.x, b.y, b.width, b.height] for key, b in boxes.items()},
    }


class DiagramSource:
    name = "diagrama"

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        if not valid_diagram(request.diagrama):
            return None
        description = request.descripcion or request.diagrama.get("titulo") or "Diagrama técnico"
        if len(description) > 2000 or not _xml_text(description):
            return None
        svg, meta = _render(request.diagrama, description)
        return ImageResult(
            data_uri="data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode("ascii"),
            source="diagrama",
            alt=description,
            meta=meta,
        )
