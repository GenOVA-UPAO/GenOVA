"""Tests unitarios para el validador y constructor determinista de consultas y sujetos."""

from llm.images.query_builder import (
    build_concrete_scene_subject,
    build_deterministic_query,
    sanitize_image_request,
    validate_consulta,
)
from llm.images.sources.contract import ImageRequest


def test_validate_consulta_rejects_urls():
    concept = "Bases de datos relacionales con PostgreSQL"
    bad_urls = [
        "https://docs.oracle.com/en/database/other-databases/nosql-database/index.html",
        "http://postgresql.org/docs/manual.html",
        "oracle.com/database",
        "www.datacenter-servers.com",
    ]
    for url in bad_urls:
        ok, reason = validate_consulta(url, concept)
        assert not ok
        assert reason == "contiene_url"


def test_validate_consulta_rejects_sql_and_code():
    concept = "Bases de datos relacionales con PostgreSQL"
    bad_queries = [
        "SELECT * FROM V$TRANSACTION",
        "INSERT INTO users VALUES (1, 'test')",
        "def configure_database(): pass;",
        "class DatabaseServer { public void init(); }",
    ]
    for q in bad_queries:
        ok, reason = validate_consulta(q, concept)
        assert not ok
        assert reason in ("contiene_sql", "contiene_codigo")


def test_validate_consulta_rejects_questions():
    concept = "Sistemas operativos y Kernel Linux"
    questions = [
        "¿Qué se observa en la imagen?",
        "What is the linux kernel doing here?",
        "¿Cómo funciona el sistema operativo?",
        "Why is the datacenter blue?",
    ]
    for q in questions:
        ok, reason = validate_consulta(q, concept)
        assert not ok
        assert reason == "contiene_pregunta"


def test_validate_consulta_rejects_over_twelve_words():
    concept = "Centros de datos y servidores de alta densidad"
    long_q = "this is an extremely long and unnecessarily verbose query that definitely exceeds the twelve words limit allowed"
    ok, reason = validate_consulta(long_q, concept)
    assert not ok
    assert "longitud_excesiva" in reason


def test_validate_consulta_rejects_spanish_sentences_for_image_banks():
    concept = "Centros de datos y servidores de alta densidad"
    spanish_q = "una sala de servidores con cables azules en el datacenter"
    ok, reason = validate_consulta(spanish_q, concept)
    assert not ok
    assert reason == "frase_en_espanol"


def test_validate_consulta_rejects_off_topic_queries():
    concept = "Bases de datos relacionales con PostgreSQL"
    off_topic = "tropical beach sunset palm trees"
    ok, reason = validate_consulta(off_topic, concept)
    assert not ok
    assert reason == "sin_sustantivos_del_tema"


def test_validate_consulta_accepts_valid_english_technical_query():
    concept = "Bases de datos relacionales con PostgreSQL"
    valid_q = "postgresql database server"
    ok, reason = validate_consulta(valid_q, concept)
    assert ok
    assert reason == "valida"


def test_build_deterministic_query_glossary():
    # Topics mapped in the glossary
    q1 = build_deterministic_query("Bases de datos relacionales con PostgreSQL")
    assert "postgresql" in q1
    assert "database" in q1

    q2 = build_deterministic_query("Seguridad en redes WiFi e inalámbricas")
    assert "wifi" in q2
    assert "security" in q2

    q3 = build_deterministic_query("Blockchain y contratos inteligentes")
    assert "blockchain" in q3

    q4 = build_deterministic_query("Programación orientada a objetos (POO)")
    assert "object oriented programming" in q4


def test_build_concrete_scene_subject():
    s1 = build_concrete_scene_subject("Bases de datos relacionales con PostgreSQL")
    assert "hard disk drive" in s1 or "magnetic platters" in s1
    assert "server" not in s1.lower()

    s2 = build_concrete_scene_subject("Redes de computadoras y cableado de fibra óptica")
    assert "fiber optic cables" in s2 or "router" in s2
    assert "engineer" not in s2.lower()
    assert "server" not in s2.lower()

    s3 = build_concrete_scene_subject("Ciberseguridad y cifrado de datos en reposo")
    assert "brass padlock" in s3
    assert "engineer" not in s3.lower()
    assert "server" not in s3.lower()

    s4 = build_concrete_scene_subject("Desarrollo de software con Python")
    assert "programming code" in s4
    assert "no visible face" in s4
    assert "server" not in s4.lower()

    s5 = build_concrete_scene_subject("Centros de datos y servidores de alta densidad")
    assert "servers in a modern datacenter rack" in s5


def test_build_concrete_scene_subject_ten_areas_variety_no_servers():
    """Verifica que build_concrete_scene_subject devuelva escenas concretas para >= 10 áreas y NINGUNA no-infraestructura use servidores."""
    areas = [
        ("Redes y Telecomunicaciones 5G", ["antennas", "router", "telecommunication"]),
        ("Inteligencia Artificial y Deep Learning", ["neural network", "robotic"]),
        ("Programación Orientada a Objetos en Python", ["code in dark mode", "no visible face"]),
        ("Ciberseguridad y Criptografía Asimétrica", ["brass padlock", "keys"]),
        ("Bases de Datos Relacionales y SQL", ["hard disk drive", "magnetic platters"]),
        ("Arquitectura de Computadoras y CPU", ["motherboard", "microprocessor"]),
        ("Sistemas Operativos y Kernel Linux", ["terminal diagnostics", "workstation monitor"]),
        ("Computación en la Nube y Microservicios", ["cloud compute pods", "container architecture"]),
        ("Metodologías Ágiles y Scrum", ["kanban", "sticky notes"]),
        ("Blockchain y Contratos Inteligentes", ["cryptographic digital blocks", "distributed ledger"]),
    ]

    for concept, expected_keywords in areas:
        subject = build_concrete_scene_subject(concept)
        # Ninguna de estas áreas debe usar servidores
        assert "server" not in subject.lower(), f"Tema '{concept}' cayó incorrectamente en 'server': {subject}"
        # Debe contener alguno de los términos visuales concretos esperados
        matched = any(kw in subject.lower() for kw in expected_keywords)
        assert matched, f"Tema '{concept}' no contiene ninguno de {expected_keywords}: {subject}"

    # Caso de infraestructura física: ÚNICA que debe usar servidores
    infra_subject = build_concrete_scene_subject("Infraestructura de Centros de Datos y Servidores en Rack")
    assert "servers in a modern datacenter rack" in infra_subject


def test_sanitize_image_request_replaces_garbage_and_records_trace():
    concept = "Bases de datos relacionales con PostgreSQL"
    garbage_req = ImageRequest(
        tipo="foto",
        descripcion="Fotografía explicativa de base de datos",
        consulta="SELECT * FROM V$TRANSACTION",
        concept=concept,
    )
    sanitized = sanitize_image_request(garbage_req)

    assert sanitized.consulta_replaced is True
    assert sanitized.original_consulta == "SELECT * FROM V$TRANSACTION"
    assert sanitized.replacement_reason == "contiene_sql"
    assert "postgresql" in sanitized.consulta
    assert "SELECT" not in sanitized.consulta


def test_sanitize_image_request_keeps_valid_query():
    concept = "Orquestación de contenedores con Kubernetes"
    valid_req = ImageRequest(
        tipo="foto",
        descripcion="Cluster de Kubernetes",
        consulta="kubernetes cluster server datacenter",
        concept=concept,
    )
    sanitized = sanitize_image_request(valid_req)

    assert sanitized.consulta_replaced is False
    assert sanitized.consulta == "kubernetes cluster server datacenter"
    assert sanitized.original_consulta == "kubernetes cluster server datacenter"


def test_sanitize_image_request_idempotent():
    concept = "Bases de datos relacionales con PostgreSQL"
    garbage_req = ImageRequest(
        tipo="foto",
        descripcion="Fotografía explicativa",
        consulta="SELECT * FROM users",
        concept=concept,
    )
    sanitized_1 = sanitize_image_request(garbage_req)
    assert sanitized_1.consulta_replaced is True
    assert sanitized_1.replacement_reason == "contiene_sql"

    # Second pass should not clear the replacement status
    sanitized_2 = sanitize_image_request(sanitized_1)
    assert sanitized_2.consulta_replaced is True
    assert sanitized_2.replacement_reason == "contiene_sql"
    assert sanitized_2.original_consulta == "SELECT * FROM users"
    assert sanitized_2.consulta == sanitized_1.consulta

