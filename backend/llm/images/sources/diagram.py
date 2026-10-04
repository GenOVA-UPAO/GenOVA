"""Diagramas SVG offline: texto escapado, geometría determinista y sin dependencias.

El lienzo crece con el contenido; width/height son preferencias de presentación,
no restricciones que obliguen a comprimir texto. ER usa conexiones directas;
flujo/capas reservan carriles. El único fragmento URI es el marcador SVG local.
"""

from __future__ import annotations

import base64
import math
import textwrap
from dataclasses import dataclass
from xml.sax.saxutils import escape, quoteattr

from llm.images.sources.contract import DIAGRAM_SCHEMA, ImageRequest, ImageResult
from llm.images.sources.diagram_semantics import (
    comparison_values,
    node_keys,
    prepare_diagram,
    semantic_valid,
)

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
    return edge.get("etiqueta", "")


def _column_layout(data: dict, top: int) -> tuple[dict[str, Box], int, int]:
    """Flow/layers: stacked boxes, explicit right-side connection lanes."""
    nodes = data["nodos"]
    if data["tipo"] == "capas":
        # Stable grouping: first occurrence defines the order of the layers.
        groups = list(dict.fromkeys(node.get("grupo", "") for node in nodes))
        nodes = [node for group in groups for node in nodes if node.get("grupo", "") == group]
    boxes = {}
    y = top
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


def _tree_layout(data: dict, top: int) -> tuple[dict[str, Box], int, int]:
    levels = _levels(data["nodos"], data.get("aristas", []))
    assert levels is not None
    boxes = {}
    y = top
    children = {n["id"]: [] for n in data["nodos"]}
    for edge in data.get("aristas", []):
        children[edge["origen"]].append(edge["destino"])
    centers = {}
    cursor = 231

    def place(ident):
        nonlocal cursor
        if children[ident]:
            for child in children[ident]:
                place(child)
            centers[ident] = (centers[children[ident][0]] + centers[children[ident][-1]]) // 2
        else:
            centers[ident] = cursor
            cursor += 470

    for node in data["nodos"]:
        if levels[node["id"]] == 0:
            place(node["id"])
    for level in range(max(levels.values()) + 1):
        nodes = [node for node in data["nodos"] if levels[node["id"]] == level]
        height = max(_node_height(node) for node in nodes)
        for node in nodes:
            boxes[node["id"]] = Box(centers[node["id"]] - 195, y, 390, height)
        y += height + 100
    return boxes, cursor - 199, y - 64


def _tree_edges(canvas: Canvas, data: dict, boxes: dict[str, Box]):
    for edge in data.get("aristas", []):
        a, b = boxes[edge["origen"]], boxes[edge["destino"]]
        ax, bx = a.x + a.width // 2, b.x + b.width // 2
        canvas.path(f"M {ax} {a.y + a.height} L {bx} {b.y - 6}")
        if label := _edge_label(edge):
            canvas.text((ax + bx) // 2 - 130, (a.y + a.height + b.y) // 2, label, length=18)


def _comparison(canvas: Canvas, data: dict, top: int) -> tuple[int, int, dict]:
    nodes = data["nodos"]
    values = [comparison_values(node) for node in nodes]
    rows = [["Criterio", *[n["etiqueta"] for n in nodes]]]
    rows += [[key.capitalize(), *[v[key] for v in values]] for key in values[0]]
    y = top
    for index, row in enumerate(rows):
        height = 30 + 22 * max(len(_lines(value)) for value in row)
        for col, value in enumerate(row):
            canvas.rect(Box(36 + col * 390, y, 390, height), WHITE if index else BACKGROUND)
            canvas.text(52 + col * 390, y + 28, value, bold=index == 0 or col == 0)
        y += height
    return 1242, y + 36, {}


def _sequence(canvas: Canvas, data: dict, top: int) -> tuple[int, int, dict]:
    nodes, edges = data["nodos"], data.get("aristas", [])
    height = max(_node_height(node) for node in nodes)
    boxes = {
        node["id"]: Box(36 + index * 430, top, 390, height) for index, node in enumerate(nodes)
    }
    bottom = top + height + 100 * (len(edges) + 1)
    for node in nodes:
        box = boxes[node["id"]]
        _draw_node(canvas, node, box)
        x = box.x + 195
        canvas.path(f"M {x} {box.y + height} V {bottom}", arrow=False, dashed=True)
    for index, edge in enumerate(edges):
        ax, bx = boxes[edge["origen"]].x + 195, boxes[edge["destino"]].x + 195
        y = top + height + 100 * (index + 1)
        points = f"M {ax} {y} H {bx}"
        if ax == bx:
            points = f"M {ax} {y} h 180 v 45 H {ax + 6}"
        canvas.path(points)
        canvas.text(min(ax, bx) + 12, y - 52, f"{index + 1}. {_edge_label(edge)}")
    return max(620, 36 + 430 * len(nodes)), bottom + 40, boxes


def _er_layout(data: dict, top: int) -> tuple[dict[str, Box], int, int]:
    nodes = data["nodos"]
    cols = min(len(nodes), 2 if len(nodes) <= 6 else 3)
    loops = {
        n["id"]: sum(e["origen"] == e["destino"] == n["id"] for e in data.get("aristas", []))
        for n in nodes
    }
    row_height = max(_node_height(node) for node in nodes) + max(190, max(loops.values()) * 70 + 50)
    slots = [
        Box(36 + (i % cols) * 680, top + (i // cols) * row_height, 390, _node_height(node))
        for i, node in enumerate(nodes)
    ]
    order = [n["id"] for n in nodes]

    def cost(ids):
        positions = {
            ident: (slot.x + 195, slot.y + slot.height / 2)
            for ident, slot in zip(ids, slots, strict=True)
        }
        segments = [
            (positions[e["origen"]], positions[e["destino"]]) for e in data.get("aristas", [])
        ]
        score = sum(math.dist(a, b) for a, b in segments)

        def cross(a, b, c):
            return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

        for i, (a, b) in enumerate(segments):
            for c, d in segments[i + 1 :]:
                if cross(a, b, c) * cross(a, b, d) < 0 and cross(c, d, a) * cross(c, d, b) < 0:
                    score += 10000
            for point in positions.values():
                if (
                    point not in (a, b)
                    and abs(cross(a, b, point)) / max(math.dist(a, b), 1) < 210
                    and min(a[0], b[0]) <= point[0] <= max(a[0], b[0])
                    and min(a[1], b[1]) <= point[1] <= max(a[1], b[1])
                ):
                    score += 20000
        return score

    best = cost(order)
    for _ in range(len(nodes)):
        improved = False
        for i in range(len(order)):
            for j in range(i + 1, len(order)):
                candidate = order.copy()
                candidate[i], candidate[j] = candidate[j], candidate[i]
                score = cost(candidate)
                if score < best:
                    order, best, improved = candidate, score, True
        if not improved:
            break
    lookup = {n["id"]: n for n in nodes}
    boxes = {
        ident: Box(slot.x, slot.y, 390, _node_height(lookup[ident]))
        for ident, slot in zip(order, slots, strict=True)
    }
    return (
        boxes,
        max(b.x + b.width for b in boxes.values()) + 36,
        max(b.y + b.height + loops[ident] * 70 for ident, b in boxes.items()) + 36,
    )


def _er_edges(canvas: Canvas, data: dict, boxes: dict[str, Box]):
    def boundary(box, other):
        cx, cy = box.x + box.width / 2, box.y + box.height / 2
        dx, dy = other.x + other.width / 2 - cx, other.y + other.height / 2 - cy
        scale = 1 / max(abs(dx) / (box.width / 2), abs(dy) / (box.height / 2), 1e-6)
        return round(cx + dx * scale), round(cy + dy * scale)

    groups = {}
    for edge in data.get("aristas", []):
        groups.setdefault(tuple(sorted((edge["origen"], edge["destino"]))), []).append(edge)
    for edge in data.get("aristas", []):
        a, b = boxes[edge["origen"]], boxes[edge["destino"]]
        peers = groups[tuple(sorted((edge["origen"], edge["destino"])))]
        index = peers.index(edge)
        if a == b:
            y = a.y + a.height + 35 + index * 70
            canvas.path(
                f"M {a.x + 40} {a.y + a.height} V {y} H {a.x + 350} V {a.y + a.height}", arrow=False
            )
            canvas.text(a.x + 50, y + 22, edge.get("etiqueta", "relación"))
            canvas.text(a.x + 20, y - 8, edge["cardinalidad"].split(":")[0], bold=True)
            canvas.text(a.x + 355, y - 8, edge["cardinalidad"].split(":")[1], bold=True)
            continue
        ax, ay = boundary(a, b)
        bx, by = boundary(b, a)
        dx, dy = bx - ax, by - ay
        length = max(math.hypot(dx, dy), 1)
        offset = (index - (len(peers) - 1) / 2) * 90
        # Use the same normal for both directions of a pair.
        sign = 1 if edge["origen"] <= edge["destino"] else -1
        mx = (ax + bx) / 2 - sign * dy / length * offset
        my = (ay + by) / 2 + sign * dx / length * offset
        points = f"M {ax} {ay} L {bx} {by}"
        if len(peers) > 1:
            points = f"M {ax} {ay} Q {round(2 * mx - (ax + bx) / 2)} {round(2 * my - (ay + by) / 2)} {bx} {by}"
        canvas.path(points, arrow=False)
        for x, y, sign, card in [
            (ax, ay, 1, edge["cardinalidad"].split(":")[0]),
            (bx, by, -1, edge["cardinalidad"].split(":")[1]),
        ]:
            canvas.text(
                round(x + sign * dx / length * 24 + (12 if abs(dy) > abs(dx) else -5)),
                round(y + sign * dy / length * 24 - 8),
                card,
                bold=True,
            )
        if label := edge.get("etiqueta"):
            lines = _lines(label, 18)
            width = min(270, max(len(line) for line in lines) * 9 + 16)
            x, y = round(mx - width / 2), round(my)
            canvas.rect(Box(x, y - 20, width, len(lines) * 22 + 6), BACKGROUND, BACKGROUND)
            canvas.text(x + 8, y - 2, label, length=18)


def _draw_tree_node(canvas: Canvas, node: dict, box: Box, btree: bool):
    keys = node_keys(node)
    if not btree or not keys:
        _draw_node(canvas, node, box)
        return
    canvas.rect(box)
    width = box.width // len(keys)
    for index, key in enumerate(keys):
        if index:
            canvas.path(f"M {box.x + index * width} {box.y} V {box.y + box.height}", arrow=False)
        canvas.text(box.x + index * width + 16, box.y + 32, f"{key:g}", bold=True)


def _render(data: dict, description: str) -> tuple[str, dict]:
    canvas = Canvas()
    kind = data["tipo"]
    title = data.get("titulo") or description
    top = 44 + 22 * len(_lines(title, 60))
    if kind in ("secuencia", "comparacion"):
        width, height, boxes = (_sequence if kind == "secuencia" else _comparison)(
            canvas, data, top
        )
    elif kind == "er":
        boxes, width, height = _er_layout(data, top)
        _er_edges(canvas, data, boxes)
        for node in data["nodos"]:
            _draw_node(canvas, node, boxes[node["id"]])
    else:
        boxes, width, height = (_tree_layout if kind == "arbol" else _column_layout)(data, top)
        (_tree_edges if kind == "arbol" else _column_edges)(canvas, data, boxes)
        for node in data["nodos"]:
            if kind == "arbol":
                _draw_tree_node(
                    canvas, node, boxes[node["id"]], "b-tree" in (title + description).lower()
                )
            else:
                _draw_node(canvas, node, boxes[node["id"]])
    width = max(width, 72 + min(60, len(title)) * 16)
    canvas.text(36, 30, title, bold=True, length=60)
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
        "hijos": {
            node["id"]: sum(e["origen"] == node["id"] for e in data.get("aristas", []))
            for node in data["nodos"]
        }
        if kind == "arbol"
        else {},
    }


class DiagramSource:
    name = "diagrama"

    def fetch(self, request: ImageRequest) -> ImageResult | None:
        if not valid_diagram(request.diagrama):
            return None
        description = request.descripcion or request.diagrama.get("titulo") or "Diagrama técnico"
        if len(description) > 2000 or not _xml_text(description):
            return None
        data = prepare_diagram(request.diagrama, request.descripcion + " " + request.concept)
        if (
            data is None
            or not valid_diagram(data)
            or not semantic_valid(data, description + " " + request.concept)
        ):
            return None
        svg, meta = _render(data, description)
        meta["diagrama"] = data
        return ImageResult(
            data_uri="data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode("ascii"),
            source="diagrama",
            alt=description,
            meta=meta,
        )
