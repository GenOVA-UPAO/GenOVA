"""Conservative, offline repairs and checks; never mutate the LLM's raw answer."""

from __future__ import annotations

import re
import unicodedata
from copy import deepcopy


def _slug(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", plain.lower()).strip("_")


def _attribute(value: str) -> str:
    marks = [mark.upper() for mark in re.findall(r"\b(?:PK|FK)\b", value, re.I)]
    name = re.sub(r"\([^)]*\)", "", value).strip()
    name = re.sub(r"\b(?:PK|FK)\b", "", name, flags=re.I).strip(" :-")
    return name + (" (" + ", ".join(dict.fromkeys(marks)) + ")" if marks else "")


def _counter(value: str) -> bool:
    return bool(re.search(r"\b(?:hijos|grado|altura|nivel|cantidad)\s*:\s*\d+", value, re.I))


def _fk_indices(node: dict, parent: dict) -> list[int]:
    """Recognize key conventions with token boundaries and optional role suffixes."""
    names = {_slug(parent["etiqueta"]), _slug(parent["id"])}
    matches = []
    for index, attr in enumerate(node.get("atributos", [])):
        if "PK" in attr.upper() and "FK" not in attr.upper():
            continue
        name = _attribute(attr).split(" (")[0]
        name = _slug(re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name))
        if any(
            re.fullmatch(
                rf"(?:id_{re.escape(n)}(?:_.+)?|{re.escape(n)}(?:_[a-z0-9]+)*_id(?:_.+)?)",
                name,
            )
            for n in names
        ):
            matches.append(index)
    return matches


def _fk(node: dict, parent: dict):
    attrs = node.setdefault("atributos", [])
    expected = _slug(parent["etiqueta"]) + "_id"
    if len(expected) > 35:
        expected = _slug(parent["id"]) + "_id"
    existing = _fk_indices(node, parent)
    if not existing:
        attrs.append(expected + " (FK)")
    for index in existing:
        if "FK" not in attrs[index].upper():
            attrs[index] += " (FK)"


def _has_fk(node: dict, parent: dict) -> bool:
    return bool(_fk_indices(node, parent))


def _cardinality(edge: dict) -> str:
    card = edge.get("cardinalidad", "").upper().replace(" ", "")
    return card.replace("..", ":").replace("-", ":").replace("*", "N").replace("M", "N")


def _consistent_er_edges(data: dict, nodes: dict, reasons: list[str]) -> list[dict] | None:
    groups = {}
    for edge in data.get("aristas", []):
        edge["cardinalidad"] = _cardinality(edge)
        if edge["cardinalidad"] not in {"1:1", "1:N", "N:1", "N:N"}:
            reasons.append(f"Cardinalidad inválida en {edge['origen']}→{edge['destino']}; usa 1:1, 1:N, N:1 o N:M")
            return None
        groups.setdefault(tuple(sorted((edge["origen"], edge["destino"]))), []).append(edge)
    result = []
    for (first, second), edges in groups.items():
        cards = {
            e["cardinalidad"] if e["origen"] == first else e["cardinalidad"][::-1] for e in edges
        }
        if len(cards) > 1:
            forward = _has_fk(nodes[second], nodes[first])
            reverse = _has_fk(nodes[first], nodes[second])
            if forward == reverse:
                reasons.append(f"Cardinalidades contradictorias en {first}↔{second}; alinea la relación y sus FK")
                return None
            coherent = "1:N" if forward else "N:1"
            edges = [
                e
                for e in edges
                if (e["cardinalidad"] if e["origen"] == first else e["cardinalidad"][::-1])
                == coherent
            ]
            if not edges:
                reasons.append(f"No hay una cardinalidad coherente con las FK en {first}↔{second}")
                return None
        for edge in edges:
            if edge not in result:
                result.append(edge)
    return result


def _merge_actors(data: dict):
    actors, redirects = {}, {}
    for node in data["nodos"]:
        key = _slug(node["etiqueta"])
        canonical = actors.setdefault(key, node)
        redirects[node["id"]] = canonical["id"]
        canonical["atributos"] = list(
            dict.fromkeys(canonical.get("atributos", []) + node.get("atributos", []))
        )
    data["nodos"] = list(actors.values())
    for edge in data.get("aristas", []):
        edge["origen"] = redirects[edge["origen"]]
        edge["destino"] = redirects[edge["destino"]]


def requested_criteria(detail: str) -> list[str]:
    """Extract explicit short criterion lists, never infer criteria from a topic."""
    for segment in re.split(r"[;.\n]", detail):
        explicit = re.search(r"\bcriterios?\s*(?::|son|de comparación:)?\s*(.+)", segment, re.I)
        listing = explicit[1] if explicit else segment.strip()
        if not explicit and "," not in listing:
            continue
        items = [item.strip() for item in re.split(r",|\s+y\s+", listing)]
        if items and all(
            re.fullmatch(r"[\wáéíóúüñ /-]{1,35}", i) and len(i.split()) <= 4 for i in items
        ):
            return list(dict.fromkeys(_slug(i) for i in items))[:5]
    return []


def _limit_comparison(data: dict, detail: str):
    def key(value):
        return "_".join(
            token
            for token in _slug(value).split("_")
            if token not in {"de", "del", "la", "el", "las", "los"}
        )

    requested = {key(value) for value in requested_criteria(detail)}
    for node in data["nodos"]:
        attrs = node.get("atributos", [])
        if requested:
            attrs = [a for a in attrs if key(a.partition(":")[0]) in requested]
        node["atributos"] = attrs


def prepare_diagram(data: dict, context: str = "") -> dict | None:
    """Input must already satisfy the schema and graph reference constraints."""
    return prepare_diagram_with_reasons(data, context)[0]


def prepare_diagram_with_reasons(data: dict, context: str = "") -> tuple[dict | None, list[str]]:
    reasons: list[str] = []
    prepared = _prepare_diagram(data, context, reasons)
    return prepared, reasons


def _prepare_diagram(data: dict, context: str, reasons: list[str]) -> dict | None:
    data = deepcopy(data)
    nodes = {n["id"]: n for n in data["nodos"]}
    for node in nodes.values():
        node["etiqueta"] = re.sub(
            r"\s*[;·|]?\s*(?:Hijos|Grado|Altura|Nivel|Cantidad)\s*:\s*\d+",
            "",
            node["etiqueta"],
            flags=re.I,
        ).strip()
        attrs = [a for a in node.get("atributos", []) if not _counter(a)]
        if data["tipo"] == "er":
            attrs = list(dict.fromkeys(filter(None, map(_attribute, attrs))))
            if not any(re.search(r"\bPK\b", a) for a in attrs):
                attrs.insert(0, "id (PK)")
        node["atributos"] = attrs
    if data["tipo"] == "secuencia":
        _merge_actors(data)
    if data["tipo"] == "comparacion":
        _limit_comparison(data, context)
    if data["tipo"] != "er":
        return data
    if context:
        connected = {e[end] for e in data.get("aristas", []) for end in ("origen", "destino")}
        text = "_" + _slug(context) + "_"
        data["nodos"] = [
            n
            for n in data["nodos"]
            if n["id"] in connected or "_" + _slug(n["etiqueta"]) + "_" in text
        ]
        nodes = {n["id"]: n for n in data["nodos"]}
    source_edges = _consistent_er_edges(data, nodes, reasons)
    if source_edges is None:
        return None
    edges = []
    inverted: set[int] = set()  # id() de las aristas giradas; la etiqueta puede no marcarlo
    for edge in source_edges:
        card = edge["cardinalidad"]
        a, b = nodes[edge["origen"]], nodes[edge["destino"]]
        if card in {"1:N", "N:1"}:
            forward, reverse = _has_fk(b, a), _has_fk(a, b)
            if forward and reverse and a != b:
                reasons.append(f"FK contradictorias en {a['id']}↔{b['id']}; coloca la FK solo en el lado N")
                return None  # Contradictory schema: no defensible direction.
            if forward != reverse:
                card = "1:N" if forward else "N:1"
        if card == "N:1":
            edge["origen"], edge["destino"] = edge["destino"], edge["origen"]
            inverted.add(id(edge))
            # Retain the distinct relationship label and mark its reversed direction.
            if a != b:
                label = edge.get("etiqueta", "relación")
                edge["etiqueta"] = label + " (inversa)" if len(label) <= 20 else label
            card = "1:N"
        a, b = nodes[edge["origen"]], nodes[edge["destino"]]
        if card == "N:N":
            # An existing join entity is identified structurally, not by domain guesses.
            candidates = []
            for node in nodes.values():
                incoming = {
                    e["origen"] for e in data.get("aristas", []) if e["destino"] == node["id"]
                }
                if node not in (a, b) and {a["id"], b["id"]} <= incoming:
                    candidates.append(node)
            if candidates:
                join = candidates[0]
            else:
                ident = "union"
                suffix = 1
                while ident in nodes:
                    ident = f"union{suffix}"
                    suffix += 1
                join = {
                    "id": ident,
                    "etiqueta": "Relación " + str(len(nodes) + 1),
                    "atributos": ["id (PK)"],
                }
                nodes[ident] = join
                data["nodos"].append(join)
                edges.extend(
                    [
                        {
                            "origen": a["id"],
                            "destino": ident,
                            "cardinalidad": "1:N",
                            "etiqueta": edge.get("etiqueta", "relación"),
                        },
                        {
                            "origen": b["id"],
                            "destino": ident,
                            "cardinalidad": "1:N",
                            "etiqueta": "relación",
                        },
                    ]
                )
            _fk(join, a)
            if a == b:
                if len(_fk_indices(join, a)) < 2:
                    join["atributos"].append(_slug(a["etiqueta"]) + "_id_destino (FK)")
            else:
                _fk(join, b)
            continue
        edge["cardinalidad"] = card
        if card == "1:N":
            _fk(b, a)
        edges.append(edge)
    data["aristas"] = _dedupe_reciprocal(edges, nodes, inverted)
    return data


def _dedupe_reciprocal(edges: list[dict], nodes: dict, inverted: set[int]) -> list[dict]:
    """El LLM suele dar cada relación en los dos sentidos (A→B 1:N y B→A N:1).

    Tras normalizar, el sentido invertido (``inverted``) duplica una línea
    ya presente: se descarta salvo que el lado N tenga varias FK de rol hacia el
    mismo padre (sigue / seguido por). Las aristas en el mismo sentido con
    etiquetas distintas son roles explícitos y se conservan.
    """
    kept: list[dict] = []
    seen: dict[tuple[str, str], int] = {}
    for edge in edges:
        pair = (edge["origen"], edge["destino"])
        inverse = id(edge) in inverted
        if inverse and seen.get(pair):
            roles = len(_fk_indices(nodes[pair[1]], nodes[pair[0]]))
            if seen[pair] >= max(1, roles):
                continue
        seen[pair] = seen.get(pair, 0) + 1
        kept.append(edge)
    return kept


def node_keys(node: dict) -> list[float]:
    label = node["etiqueta"].strip()
    values = [label] if re.fullmatch(r"[\[\]\s,;\d.\-]+", label) else []
    explicit = [
        a.split(":", 1)[-1]
        for a in node.get("atributos", [])
        if re.match(r"(?:claves?|keys?|valor)\s*:", a, re.I)
    ]
    if explicit:
        values = explicit  # A numeric label may name just one key of a multi-key node.
    return [float(v) for value in values for v in re.findall(r"-?\d+(?:\.\d+)?", value)]


def _state_flow_rejection_reasons(data: dict, context: str) -> list[str]:
    """Only infer terminal/error semantics for recognizable state diagrams."""
    topic = _slug(context)
    transaction = "transaccion" in topic
    if not transaction and not re.search(r"(?:estados?|ciclo_de_vida)", topic):
        return []
    nodes = {n["id"]: n for n in data["nodos"]}
    labels = {ident: _slug(n["etiqueta"]) for ident, n in nodes.items()}
    transaction = transaction and bool(
        set(labels.values()) & {"activa", "activo", "fallida", "fallido", "abortada", "abortado"}
    )
    edges = data.get("aristas", [])
    # A textbook transaction can include a separate terminal state after commit/abort.
    terminated = any(label in {"terminada", "terminado"} for label in labels.values())
    finals = {
        ident
        for ident, node in nodes.items()
        if labels[ident] in {"fin", "final", "terminada", "terminado"}
        or any(
            re.fullmatch(r"(?:estado_)?final(?:_.*)?", _slug(attr))
            for attr in node.get("atributos", [])
        )
        or (
            transaction
            and not terminated
            and labels[ident] in {"abortada", "abortado", "confirmada", "confirmado", "committed"}
        )
    }
    if not finals and not transaction:
        return []  # Unknown lifecycle: do not invent which states are terminal.
    # Read permission from the user's detail, never from a generated edge or title.
    retry = bool(re.search(r"\b(?:reintent\w*|reinici\w*|retry)\b", context, re.I))
    if re.search(
        r"\b(?:sin|no|nunca)\s+(?:\w+\s+){0,2}(?:reintent\w*|reinici\w*|retry)\b", context, re.I
    ):
        retry = False
    reasons = []
    for ident in nodes:
        outgoing = [e for e in edges if e["origen"] == ident]
        if (
            transaction
            and terminated
            and labels[ident] in {"abortada", "abortado", "confirmada", "confirmado", "committed"}
            and not retry
            and any(labels[e["destino"]] not in {"terminada", "terminado"} for e in outgoing)
        ):
            reasons.append(f'El estado "{nodes[ident]["etiqueta"]}" solo puede salir hacia "Terminada"; elimina otras salidas')
        if ident in finals:
            if outgoing and not retry:
                reasons.append(f'El estado final "{nodes[ident]["etiqueta"]}" tiene salidas; elimínalas')
        elif not outgoing:
            reasons.append(f'El estado no final "{nodes[ident]["etiqueta"]}" no tiene salida; añade una transición')
    if transaction:
        failed = {
            ident for ident, label in labels.items() if label in {"fallida", "fallido", "failed"}
        }
        for ident, label in labels.items():
            if label in {
                "activa",
                "activo",
                "parcialmente_confirmada",
                "parcialmente_confirmado",
            } and not any(e["origen"] == ident and e["destino"] in failed for e in edges):
                target = nodes[next(iter(sorted(failed)))]["etiqueta"] if failed else "Fallida"
                reasons.append(f'Falta la transición de error desde "{nodes[ident]["etiqueta"]}" hacia "{target}"')
    return reasons


def semantic_valid(data: dict, context: str) -> bool:
    """Check only recognizable invariants; unknown concepts need human review."""
    return not semantic_rejection_reasons(data, context)


def semantic_rejection_reasons(data: dict, context: str) -> list[str]:
    reasons: list[str] = []
    _semantic_valid(data, context, reasons)
    return reasons


def _semantic_valid(data: dict, context: str, reasons: list[str]) -> bool:
    def reject(reason: str) -> bool:
        reasons.append(reason)
        return False

    topic = _slug(context + " " + data.get("titulo", ""))
    if data["tipo"] == "flujo":
        reasons.extend(_state_flow_rejection_reasons(data, context))
        if reasons:
            return False
    if data["tipo"] == "comparacion":
        if len(data["nodos"]) != 2:
            return reject("La comparación requiere exactamente dos nodos; conserva las dos alternativas")
        # Named criteria must align; positional anonymous rows cannot be compared reliably.
        criteria = [comparison_values(node) for node in data["nodos"]]
        if not 1 <= len(criteria[0]) <= 5 or criteria[0].keys() != criteria[1].keys():
            return reject("La comparación requiere de 1 a 5 criterios completos y únicos, iguales en ambas alternativas")
        return True
    if data["tipo"] == "flujo" and "normalizacion" in topic:
        for node in data["nodos"]:
            if "1fn" in _slug(node["etiqueta"]):
                attrs = _slug(" ".join(node.get("atributos", [])))
                if "parciales" in attrs or "transitivas" in attrs:
                    return reject("1FN no elimina dependencias parciales ni transitivas; corrige sus atributos")
    if data["tipo"] == "flujo" and "busqueda_binaria" in topic:
        # A mismatch is not a proof of absence: require an explicit success exit.
        edges = data.get("aristas", [])
        exits = [n for n in data["nodos"] if not any(e["origen"] == n["id"] for e in edges)]
        success = [
            n
            for n in exits
            if re.search(
                r"(?:encontrad|devolver|retornar|indice|resultado)",
                _slug(n["etiqueta"] + " " + " ".join(n.get("atributos", []))),
            )
            and "no_" not in _slug(n["etiqueta"])
        ]
        if not success:
            return reject("Falta una salida de éxito en la búsqueda binaria; añade el resultado encontrado")
    if data["tipo"] != "arbol":
        return True  # All message actors are checked by graph reference validation.
    context = _slug(context + " " + data.get("titulo", ""))
    bst = "binario_de_busqueda" in context or "bst" in context
    heap = "heap" in context or "monticulo" in context
    btree = "b_tree" in context or "btree" in context
    if not (bst or heap or btree):
        return True
    nodes = {n["id"]: n for n in data["nodos"]}
    children = {ident: [] for ident in nodes}
    for edge in data.get("aristas", []):
        children[edge["origen"]].append(edge["destino"])
    roots = set(nodes) - {e["destino"] for e in data.get("aristas", [])}
    if len(roots) != 1:
        return reject("El árbol debe tener exactamente una raíz; conecta los nodos a una raíz común")
    keys = {ident: node_keys(node) for ident, node in nodes.items()}
    if any(not value or value != sorted(set(value)) for value in keys.values()):
        return reject("Las claves del árbol deben ser numéricas, únicas y ordenadas en cada nodo")
    if (bst or heap) and any(len(value) != 1 for value in keys.values()):
        return reject("BST y heap requieren una sola clave por nodo")
    if heap:
        minimum = "max" not in context
        valid = all(
            len(c) <= 2
            and all(
                (keys[p][0] <= keys[ch][0] if minimum else keys[p][0] >= keys[ch][0]) for ch in c
            )
            for p, c in children.items()
        )
        return valid or reject("El heap requiere hasta dos hijos por nodo y respetar el orden mínimo/máximo")
    order_match = re.search(r"orden_(\d+)", context)
    order = int(order_match[1]) if order_match else None
    depths = set()

    def visit(ident, low, high, depth):
        values, kids = keys[ident], children[ident]
        if not all(low < key < high for key in values):
            return reject(f'Las claves de "{nodes[ident]["etiqueta"]}" están fuera del rango de sus antecesores')
        if (
            btree
            and order
            and (len(values) >= order or (depth and len(values) < (order + 1) // 2 - 1))
        ):
            return reject(f'El nodo "{nodes[ident]["etiqueta"]}" no respeta la cantidad de claves del B-Tree de orden {order}')
        if not kids:
            depths.add(depth)
            return True
        if bst:
            if len(kids) > 2:
                return reject("Un nodo BST tiene más de dos hijos; conserva solo izquierdo y derecho")
            bounds = []
            for index, child in enumerate(kids):
                edge = next(
                    e for e in data["aristas"] if e["origen"] == ident and e["destino"] == child
                )
                label = _slug(edge.get("etiqueta", ""))
                left = "izq" in label or ("der" not in label and keys[child][0] < values[0])
                if len(kids) == 2 and left != (index == 0):
                    return reject("Los hijos BST deben aparecer en orden izquierda→derecha")
                bounds.append((low, values[0]) if left else (values[0], high))
            if len(set(bounds)) != len(bounds):
                return reject("Los dos hijos BST ocupan el mismo lado; corrige sus claves o etiquetas")
        else:
            if len(kids) != len(values) + 1:
                return reject("Cada nodo interno B-Tree debe tener un hijo más que claves")
            limits = [low, *values, high]
            bounds = list(zip(limits, limits[1:], strict=False))
        return all(
            visit(child, a, b, depth + 1) for child, (a, b) in zip(kids, bounds, strict=True)
        )

    if not visit(next(iter(roots)), float("-inf"), float("inf"), 0):
        return False
    if btree and len(depths) != 1:
        return reject("Las hojas del B-Tree deben estar a la misma profundidad")
    return True


def comparison_values(node: dict) -> dict[str, str]:
    values = {}
    for index, attr in enumerate(node.get("atributos", [])):
        criterion, sep, value = attr.partition(":")
        key = criterion.strip().casefold() if sep else f"criterio {index + 1}"
        text = value.strip() if sep else attr.strip()
        if key in values or not text or re.search(r"[,;:]$|\b(?:con|de|y|en)$", text, re.I):
            return {}
        values[key] = value.strip() if sep else attr
    return values
