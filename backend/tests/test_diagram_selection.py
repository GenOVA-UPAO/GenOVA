"""Tests para clasificación de rasgos, selección de tipo de diagrama y validación léxica/semántica."""

from llm.images.sources.diagram_selection import (
    classify_topic_traits,
    validate_diagram_edges,
    validate_diagram_nodes,
    validate_diagram_quality,
)


def test_classify_topic_traits_poo_rejects_flujo():
    traits = classify_topic_traits("Programación orientada a objetos (POO)")
    assert "flujo" not in traits
    assert "arbol" in traits or "capas" in traits


def test_classify_topic_traits_blockchain_rejects_er():
    traits = classify_topic_traits("Blockchain y contratos inteligentes")
    assert "er" not in traits
    assert "capas" in traits or "secuencia" in traits or "flujo" in traits


def test_classify_topic_traits_wifi_security():
    traits = classify_topic_traits("Seguridad en redes WiFi e inalámbricas")
    assert "secuencia" in traits or "capas" in traits


def test_classify_topic_traits_processes_and_pipelines():
    traits = classify_topic_traits("Ciclo de vida de un proceso y transiciones de estados")
    assert traits[0] == "flujo"


def test_classify_topic_traits_relational_databases():
    traits = classify_topic_traits("Bases de datos relacionales con PostgreSQL")
    assert traits[0] == "er"


def test_classify_topic_traits_comparison():
    traits = classify_topic_traits("Docker vs Podman: diferencias en contenedores")
    assert traits[0] == "comparacion"


def test_classify_topic_traits_by_template_key():
    assert classify_topic_traits("Cualquier tema", template_key="explain:09") == ["comparacion"]
    assert "capas" in classify_topic_traits("Cualquier tema", template_key="explain:08")


def test_validate_diagram_edges_rejects_generic_concept_map():
    generic_edges = [
        {"origen": "a", "destino": "b", "etiqueta": "Relación"},
        {"origen": "b", "destino": "c", "etiqueta": "conexión"},
        {"origen": "a", "destino": "c", "etiqueta": "asociación"},
    ]
    ok, reason = validate_diagram_edges(generic_edges, "capas")
    assert not ok
    assert "mapa_conceptos_aristas_genericas" in reason


def test_validate_diagram_edges_accepts_meaningful_edges():
    meaningful_edges = [
        {"origen": "a", "destino": "b", "etiqueta": "envía consulta SQL", "cardinalidad": "1:N"},
        {"origen": "b", "destino": "c", "etiqueta": "retorna conjunto de filas"},
    ]
    ok, reason = validate_diagram_edges(meaningful_edges, "secuencia")
    assert ok
    assert reason == "ok"


def test_validate_diagram_nodes_rejects_syllabus_index():
    syllabus_nodes = [
        {"id": "n1", "etiqueta": "Introducción"},
        {"id": "n2", "etiqueta": "Tema 1: Conceptos"},
        {"id": "n3", "etiqueta": "Conclusión"},
    ]
    ok, reason = validate_diagram_nodes(syllabus_nodes, "Bases de datos relacionales con PostgreSQL", "flujo")
    assert not ok
    assert "nodos_indice_temario" in reason


def test_validate_diagram_nodes_rejects_poo_as_flow_of_syllabus_topics():
    poo_nodes = [
        {"id": "n1", "etiqueta": "Clases"},
        {"id": "n2", "etiqueta": "Objetos"},
        {"id": "n3", "etiqueta": "Herencia"},
        {"id": "n4", "etiqueta": "Polimorfismo"},
    ]
    ok, reason = validate_diagram_nodes(poo_nodes, "Programación orientada a objetos (POO)", "flujo")
    assert not ok
    assert "flujo_es_indice_temario_poo" in reason


def test_validate_diagram_nodes_lexical_control_rejects_off_topic_nodes():
    # Blockchain con entidades de tienda/envíos (error detectado en v3)
    off_topic_nodes = [
        {"id": "n1", "etiqueta": "Cliente", "atributos": ["id (PK)", "nombre"]},
        {"id": "n2", "etiqueta": "Envío", "atributos": ["id (PK)", "direccion"]},
        {"id": "n3", "etiqueta": "Producto", "atributos": ["id (PK)", "precio"]},
    ]
    ok, reason = validate_diagram_nodes(off_topic_nodes, "Blockchain y contratos inteligentes", "er")
    assert not ok
    assert "falta_relevancia_lexica" in reason


def test_validate_diagram_nodes_lexical_control_accepts_relevant_nodes():
    relevant_nodes = [
        {"id": "n1", "etiqueta": "Bloque Génesis", "atributos": ["hash (PK)", "timestamp"]},
        {"id": "n2", "etiqueta": "Nodo Minero", "atributos": ["id (PK)", "transacciones"]},
    ]
    ok, reason = validate_diagram_nodes(relevant_nodes, "Blockchain y contratos inteligentes", "capas")
    assert ok
    assert reason == "ok"


def test_validate_diagram_quality_full():
    concept = "Bases de datos relacionales con PostgreSQL"

    # Diagrama de tipo incorrecto para el tema (p. ej. flujo en vez de er/capas)
    bad_type_diagram = {
        "tipo": "secuencia",
        "titulo": "Flujo de temas",
        "nodos": [{"id": "n1", "etiqueta": "PostgreSQL"}],
        "aristas": [],
    }
    ok, reason = validate_diagram_quality(bad_type_diagram, concept)
    assert not ok
    assert "tipo_inadecuado" in reason

    # Diagrama correcto y relevante
    good_diagram = {
        "tipo": "er",
        "titulo": "Modelo Entidad-Relación PostgreSQL",
        "nodos": [
            {"id": "t1", "etiqueta": "Tabla Clientes", "atributos": ["id (PK)", "nombre"]},
            {"id": "t2", "etiqueta": "Tabla Pedidos", "atributos": ["id (PK)", "cliente_id (FK)"]},
        ],
        "aristas": [{"origen": "t1", "destino": "t2", "etiqueta": "posee", "cardinalidad": "1:N"}],
    }
    ok, reason = validate_diagram_quality(good_diagram, concept)
    assert ok
    assert reason == "valido"
