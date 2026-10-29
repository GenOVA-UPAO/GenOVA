"""Reglas de selección, clasificación y validación léxica/semántica de diagramas.

Asegura que el tipo de diagrama sea coherente con los rasgos del tema:
- proceso/pasos -> flujo
- estructura jerárquica -> arbol
- datos/entidades -> er
- arquitectura/niveles -> capas
- interacción entre actores/protocolo -> secuencia
- «X vs Y» -> comparacion

Rechaza diagramas que no coincidan con el tipo esperado, mapas de conceptos
sin relaciones con sentido (aristas genéricas 'Relación', nodos índice de temas),
o diagramas sin mención a términos centrales del tema (control léxico).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from llm.images.query_builder import extract_topic_stems

# Aristas genéricas que denotan un mapa de conceptos sin relaciones con sentido
GENERIC_EDGE_LABELS: set[str] = {
    "relacion",
    "relación",
    "asociacion",
    "asociación",
    "vinculo",
    "vínculo",
    "conexion",
    "conexión",
    "se relaciona con",
    "tiene",
    "incluye",
    "asociado a",
    "relacionado",
    "relación entre",
    "concepto",
    "tema",
    "enlace",
}

# Etiquetas de nodos que denotan un índice de temario de curso o estructura estática
SYLLABUS_INDEX_NODE_LABELS: set[str] = {
    "introduccion",
    "introducción",
    "conceptos basicos",
    "conceptos básicos",
    "definicion",
    "definición",
    "tema 1",
    "tema 2",
    "tema 3",
    "unidad 1",
    "unidad 2",
    "modulo 1",
    "modulo 2",
    "syllabus",
    "resumen",
    "conclusion",
    "conclusión",
    "objetivos",
    "evaluacion",
    "evaluación",
    "contenido",
    "temario",
}


def _strip_accents(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return plain.lower()


def classify_topic_traits(
    concept: str,
    description: str = "",
    template_key: str = "",
) -> list[str]:
    """Infiere los tipos de diagrama esperados según los rasgos del tema y la plantilla.

    Devuelve una lista ordenada por idoneidad pedagógica.
    """
    norm_tpl = (template_key or "").lower().strip()
    if norm_tpl in ("explain:09", "explain:9"):
        return ["comparacion"]
    if norm_tpl in ("explain:08", "explain:8"):
        return ["capas", "flujo"]

    norm_text = _strip_accents(f"{concept} {description}")

    # Reglas específicas de desambiguación para casos problemáticos documentados
    # 1. Programación Orientada a Objetos: estructura jerárquica / clases (arbol o capas, NUNCA flujo)
    if re.search(r"\b(poo|orientad[ao] a objetos|clases y objetos|herencia y polimorfismo)\b", norm_text):
        return ["arbol", "capas", "comparacion"]

    # 2. Blockchain / Contratos Inteligentes: arquitectura de bloques / validación (capas, secuencia o flujo)
    # NUNCA modelo ER de e-commerce (clientes/envíos)
    if re.search(r"\b(blockchain|cadena de bloques|contratos? inteligentes?|consenso)\b", norm_text):
        return ["capas", "secuencia", "flujo"]

    # 3. Seguridad WiFi / Redes inalámbricas: protocolo / handshake / stack (secuencia o capas)
    if re.search(r"\b(wifi|inal[aá]mbric[ao]|wpa|handshake 4[\s-]v[ií]as)\b", norm_text):
        return ["secuencia", "capas", "comparacion"]

    # 4. «X vs Y» o contraste directo
    if re.search(r"\b(vs|versus|comparaci[oó]n|comparativa|diferencias? entre|frente a)\b", norm_text):
        return ["comparacion", "capas"]

    # 5. Interacción entre actores / protocolo / mensajes
    if re.search(r"\b(protocolo|handshake|secuencia|mensajes?|intercambio|peticion|respuesta|dns|autenticaci[oó]n|cliente[\s-]servidor)\b", norm_text):
        return ["secuencia", "capas", "flujo"]

    # 6. Datos / entidades / relacional
    if re.search(r"\b(entidad[\s-]relaci[oó]n|modelo er|diagrama er|\ber\b|relacional|tablas?|claves?|cardinalidad|base de datos relacional|postgresql|mysql|oracle|sqlite|sql)\b", norm_text):
        return ["er", "capas"]

    # 7. Estructura jerárquica / árboles
    if re.search(r"\b([aá]rbol|b[\s-]?tree|bst|binario|jerarqu[ií]a|directorio|arborescencia|taxonom[ií]a)\b", norm_text):
        return ["arbol", "capas"]

    # 8. Arquitectura / niveles / componentes / stack
    if re.search(r"\b(capas|arquitectura|stack|infraestructura|niveles?|bloques|microservicios|nginx|cluster|kubernetes|docker|cloud|virtualizaci[oó]n)\b", norm_text):
        return ["capas", "flujo"]

    # 9. Proceso / pasos / etapas / ciclo / pipeline / algoritmo
    if re.search(r"\b(proceso|pasos?|etapas?|ciclo|flujo|pipeline|algoritmo|transici[oó]n|fases?|ejecuci[oó]n|estados?)\b", norm_text):
        return ["flujo", "capas"]

    # Fallback según características generales del tema
    return ["capas", "flujo", "comparacion"]


def is_expected_diagram_type(
    diagram_type: str,
    concept: str,
    description: str = "",
    template_key: str = "",
) -> bool:
    """Verifica si el tipo de diagrama propuesto es admisible para el tema."""
    expected = classify_topic_traits(concept, description, template_key)
    return diagram_type in expected


def validate_diagram_edges(edges: list[dict[str, Any]], diagram_type: str) -> tuple[bool, str]:
    """Rechaza diagramas con aristas genéricas tipo 'Relación' (mapa de conceptos suelto)."""
    if not edges:
        return True, "ok"

    generic_count = 0
    total_edges = len(edges)

    for edge in edges:
        lbl = _strip_accents(str(edge.get("etiqueta") or "")).strip()
        if not lbl:
            # En diagramas de flujo o secuencia, aristas sin etiqueta o vacías restan valor
            if diagram_type in ("flujo", "secuencia"):
                generic_count += 1
            continue
        if lbl in GENERIC_EDGE_LABELS or any(lbl == g for g in GENERIC_EDGE_LABELS):
            generic_count += 1

    # Si más del 40% de las aristas son genéricas, se rechaza
    if total_edges > 0 and (generic_count / total_edges) >= 0.40:
        return False, f"mapa_conceptos_aristas_genericas ({generic_count}/{total_edges} genericas)"

    return True, "ok"


def validate_diagram_nodes(
    nodes: list[dict[str, Any]],
    concept: str,
    diagram_type: str,
    description: str = "",
) -> tuple[bool, str]:
    """Valida los nodos del diagrama: rechaza temarios de curso y exige relevancia léxica."""
    if not nodes:
        return False, "sin_nodos"

    # 1. Rechazo de nodos que son capítulos o índices de temario
    for node in nodes:
        label_norm = _strip_accents(str(node.get("etiqueta") or "")).strip()
        if label_norm in SYLLABUS_INDEX_NODE_LABELS:
            return False, f"nodos_indice_temario ('{label_norm}')"

    # En diagramas de flujo sobre POO, rechazar si los nodos son los temas teóricos de la asignatura
    if diagram_type == "flujo" and re.search(r"\b(poo|orientad[ao] a objetos)\b", _strip_accents(concept)):
        syllabus_tokens = {"clases", "objetos", "herencia", "polimorfismo", "encapsulamiento", "abstraccion"}
        node_labels_set = {_strip_accents(str(n.get("etiqueta") or "")) for n in nodes}
        if len(node_labels_set & syllabus_tokens) >= 3:
            return False, "flujo_es_indice_temario_poo"

    # 2. Control de relevancia léxica: al menos un nodo debe mencionar un término central del tema
    if not concept:
        return True, "ok"

    stems = extract_topic_stems(concept)
    if not stems:
        return True, "ok"
    all_node_text = " ".join(
        f"{n.get('etiqueta', '')} {' '.join(n.get('atributos', []))} {n.get('grupo', '')}"
        for n in nodes
    )
    node_text_norm = _strip_accents(all_node_text)
    node_words = set(re.findall(r"[a-z0-9]{3,}", node_text_norm))

    lexical_matches = stems & node_words
    if not lexical_matches:
        # Permitir sinónimos técnicos evidentes del tema
        concept_norm = _strip_accents(concept)
        synonyms = _get_concept_synonyms(concept_norm)
        if not (synonyms & node_words):
            return False, f"falta_relevancia_lexica (ningun nodo menciona terminos de '{concept}')"

    return True, "ok"


def _get_concept_synonyms(concept_norm: str) -> set[str]:
    """Devuelve sinónimos técnicos asociados para el control léxico de tolerancia."""
    syns = set()
    if "bases de datos" in concept_norm or "postgresql" in concept_norm or "sql" in concept_norm:
        syns.update({"tabla", "tablas", "registro", "registros", "columna", "columnas", "indice", "indices", "database"})
    if "blockchain" in concept_norm:
        syns.update({"bloque", "bloques", "hash", "cadena", "minero", "consenso", "transaccion", "transacciones"})
    if "wifi" in concept_norm or "inalambrica" in concept_norm:
        syns.update({"ssid", "wpa2", "wpa3", "router", "cliente", "access", "point", "cifrado"})
    if "poo" in concept_norm or "objetos" in concept_norm:
        syns.update({"clase", "objeto", "metodo", "atributo", "instancia", "interfaz"})
    if "kubernetes" in concept_norm:
        syns.update({"pod", "pods", "nodo", "nodos", "cluster", "deployment", "service"})
    if "docker" in concept_norm:
        syns.update({"contenedor", "contenedores", "imagen", "daemon", "volumen"})
    if "kafka" in concept_norm:
        syns.update({"topic", "topico", "particion", "broker", "productor", "consumidor"})
    if "nginx" in concept_norm:
        syns.update({"upstream", "proxy", "worker", "servidor", "cliente"})
    if "monitoreo" in concept_norm:
        syns.update({"metrica", "metricas", "alerta", "dashboard", "agente", "grafana"})
    if "raid" in concept_norm:
        syns.update({"disco", "discos", "bloque", "paridad", "controlador"})
    if "telecomunicaciones" in concept_norm or "switches" in concept_norm:
        syns.update({"puerto", "puertos", "vlan", "trama", "paquete", "enlace"})
    return syns


def validate_diagram_quality(
    diagram: dict[str, Any],
    concept: str,
    description: str = "",
    template_key: str = "",
) -> tuple[bool, str]:
    """Envoltorio compatible: mantiene la tupla y los códigos usados por el router."""
    return _validate_diagram_quality(diagram, concept, description, template_key)


def quality_rejection_reasons(
    diagram: dict[str, Any],
    concept: str,
    description: str = "",
    template_key: str = "",
) -> list[str]:
    ok, reason = _validate_diagram_quality(diagram, concept, description, template_key)
    if ok:
        return []
    if reason.startswith("tipo_inadecuado"):
        expected = classify_topic_traits(concept, description, template_key)
        return [f"Tipo de diagrama inadecuado; usa uno de: {', '.join(expected)}"]
    if reason.startswith("mapa_conceptos_aristas_genericas"):
        return ["Demasiadas aristas genéricas; etiqueta cada relación con una acción o condición específica"]
    if reason.startswith("nodos_indice_temario"):
        return ["Un nodo es un índice de temario; reemplázalo por un elemento concreto del concepto"]
    if reason == "flujo_es_indice_temario_poo":
        return ["El flujo enumera temas de POO; representa pasos o decisiones de un proceso real"]
    if reason.startswith("falta_relevancia_lexica"):
        return [f'Los nodos no representan "{concept[:160]}"; incluye elementos o términos del tema']
    if reason == "sin_nodos":
        return ["El diagrama no tiene nodos; añade los elementos del concepto"]
    return ["El diagrama debe ser un objeto JSON con nodos y aristas"]


def _validate_diagram_quality(
    diagram: dict[str, Any],
    concept: str,
    description: str = "",
    template_key: str = "",
) -> tuple[bool, str]:
    """Evalúa exhaustivamente la validez pedagógica y estructural del diagrama."""
    if not isinstance(diagram, dict):
        return False, "diagrama_no_es_diccionario"

    kind = str(diagram.get("tipo") or "")
    if not is_expected_diagram_type(kind, concept, description, template_key):
        expected = classify_topic_traits(concept, description, template_key)
        return False, f"tipo_inadecuado:{kind} (esperado: {expected})"

    # Validar aristas
    ok_edges, edge_reason = validate_diagram_edges(diagram.get("aristas", []), kind)
    if not ok_edges:
        return False, edge_reason

    # Validar nodos
    ok_nodes, node_reason = validate_diagram_nodes(
        diagram.get("nodos", []), concept, kind, description=description
    )
    if not ok_nodes:
        return False, node_reason

    return True, "valido"
