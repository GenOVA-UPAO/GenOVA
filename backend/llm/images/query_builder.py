"""Constructor y validador determinista de consultas y sujetos de imagen.

Asegura peticiones robustas ante salidas mal formateadas del LLM:
- Valida 'consulta': rechaza URLs, SQL/código, signos de pregunta, >12 palabras,
  frases en español para bancos en inglés o consultas sin sustantivos del tema.
- Si 'consulta' es inválida, la construye de forma DETERMINISTA desde 'descripcion'
  + tema del OVA mediante glosario técnico y extracción de términos clave en inglés.
- Construye el sujeto concreto para generación ('escena' y respaldos).
"""

from __future__ import annotations

import re
import unicodedata
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from llm.images.sources.contract import ImageRequest

# Regex de URLs y dominios comunes
_URL_RE = re.compile(
    r"(?:https?://|www\.|(?:\b[\w-]+\.)+(?:com|org|net|edu|io|es|pe|gov|mil|ai|dev|co)\b|oracle\.com)",
    re.IGNORECASE,
)

# Regex de SQL y estructuras de código
_SQL_RE = re.compile(
    r"(?:\bSELECT\b[\s\S]*?\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b|"
    r"\bCREATE\s+(?:TABLE|DATABASE|VIEW|INDEX)\b|\bDROP\s+(?:TABLE|DATABASE|VIEW)\b|\bV\$\w+\b|"
    r"\bSELECT\s+\*|\bFROM\s+V\$)",
    re.IGNORECASE,
)
_CODE_RE = re.compile(
    r"(?:;\s*$|[{};]|=>|//|/\*|\*/|\bdef\s+\w+|\bclass\s+\w+|\bimport\s+\w+|\bpublic\s+\w+|\bfunction\b|\bconst\s+\w+|\bvar\s+\w+)",
    re.IGNORECASE,
)

# Regex de signos de interrogación o fórmulas de pregunta
_QUESTION_RE = re.compile(
    r"[?¿]|\b(?:qu[eé]\s+se\s+observa|what\s+is|what\s+do|how\s+to|c[oó]mo|cu[aá]l|why|qu[eé]\s+es)\b",
    re.IGNORECASE,
)

# Stopwords y partículas en español frecuentes en bancos de imágenes en inglés
_SPANISH_STOPWORDS_RE = re.compile(
    r"\b(?:de|la|el|los|las|un|una|unos|unas|en|para|por|con|sobre|del|al|que|es|son|y|o)\b",
    re.IGNORECASE,
)

# Glosario técnico determinista: español normalizado -> sustantivos técnicos en inglés
_GLOSSARY_MAP: list[tuple[str, str]] = [
    # Conceptos clave de Ciencias de la Computación
    (r"postgresql|postgres", "postgresql database server"),
    (r"kubernetes|k8s", "kubernetes cluster container infrastructure"),
    (r"docker|contenedores?", "docker container virtualization server"),
    (r"redis", "redis in-memory cache database"),
    (r"mongodb", "mongodb nosql database server"),
    (r"kafka|apache kafka", "apache kafka event streaming cluster"),
    (r"linux|kernel linux", "linux kernel operating system server"),
    (r"git|control de versiones", "git version control repository"),
    (r"python", "python programming code development"),
    (r"nginx", "nginx web server reverse proxy"),
    (r"centros? de datos|datacenter|servidores?", "datacenter server racks infrastructure"),
    (r"ciberseguridad|cifrado de datos|seguridad informatica", "cybersecurity data encryption network"),
    (r"redes? de computadoras?|fibra [oó]ptica", "computer networking fiber optic cables"),
    (r"arquitectura de computadoras?|circuitos integrados?|cpu|microprocesador", "computer architecture microprocessor circuit"),
    (r"infraestructura cloud|virtualizaci[oó]n", "cloud infrastructure virtualization servers"),
    (r"monitoreo operativo|observabilidad", "systems monitoring observability metrics"),
    (r"superc[oó]mputo|clusters? de gpu", "supercomputer gpu cluster datacenter"),
    (r"cumplimiento normativo|auditor[ií]a de bases de datos", "database audit data compliance"),
    (r"arreglos? de discos?|raid|almacenamiento masivo", "raid disk array storage servers"),
    (r"telecomunicaciones|switches?|conmutador", "telecommunications network switch rack"),
    # Conceptos adicionales comunes y de heldout
    (r"blockchain|cadena de bloques|contratos? inteligentes?", "blockchain distributed ledger network"),
    (r"seguridad wifi|redes? inal[aá]mbricas?", "wifi wireless network security encryption"),
    (r"programaci[oó]n orientada a objetos|poo|clases y objetos", "object oriented programming architecture"),
    (r"microservicios?|servicios distribuidos", "microservices architecture cloud servers"),
    (r"inteligencia artificial|aprendizaje profundo|deep learning|machine learning", "artificial intelligence machine learning servers"),
    (r"criptograf[ií]a asim[eé]trica|rsa|claves p[uú]blicas", "asymmetric cryptography rsa encryption"),
    (r"memoria ram|almacenamiento ssd", "ram memory solid state storage hardware"),
    (r"desarrollo [aá]gil|scrum|tablero kanban", "software development agile board workflow"),
    (r"cliente[\s-]servidor|protocolo http", "client server network infrastructure"),
    (r"placa base|motherboard", "computer motherboard electronics"),
    (r"cables? submarinos?", "submarine communications cable networking"),
    (r"firewall|cortafuegos|detecci[oó]n de intrusos", "firewall network security appliance"),
    (r"base de datos relacional|modelo er|sql", "relational database sql storage"),
    (r"base de datos|bases de datos", "database server system"),
    (r"algoritmos?|estructuras? de datos", "algorithms data structures computing"),
]

# Diccionario palabra por palabra para traducción determinista de términos sueltos
_WORD_TRANSLATIONS: dict[str, str] = {
    "servidor": "server",
    "servidores": "servers",
    "red": "network",
    "redes": "networks",
    "datos": "data",
    "base": "database",
    "bases": "databases",
    "cifrado": "encryption",
    "seguridad": "security",
    "codigo": "code",
    "desarrollo": "development",
    "computadora": "computer",
    "computadoras": "computers",
    "procesador": "microprocessor",
    "memoria": "memory",
    "almacenamiento": "storage",
    "archivo": "file",
    "archivos": "files",
    "disco": "disk",
    "discos": "disks",
    "nube": "cloud",
    "enlace": "link",
    "enlaces": "links",
    "cable": "cable",
    "cables": "cables",
    "bloque": "block",
    "bloques": "blocks",
    "nodo": "node",
    "nodos": "nodes",
    "cluster": "cluster",
    "conmutador": "switch",
    "conmutadores": "switches",
    "inalambrica": "wireless",
    "inalambrico": "wireless",
    "remoto": "remote",
    "distribuido": "distributed",
    "distribuida": "distributed",
    "operativo": "operating",
    "sistema": "system",
    "sistemas": "systems",
    "tablero": "board",
    "modulo": "module",
    "modulos": "modules",
}


def _strip_accents(text: str) -> str:
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return plain.lower()


def extract_topic_stems(concept: str) -> set[str]:
    """Extrae raíces/lemas léxicos clave del tema para control de relevancia."""
    norm = _strip_accents(concept)
    words = re.findall(r"[a-z0-9]{3,}", norm)
    # Excluir palabras vacías generales
    stopwords = {
        "con", "para", "por", "sobre", "del", "las", "los", "una", "uno",
        "tema", "ova", "curso", "estudio", "unidad", "modulo", "fase",
    }
    return {w for w in words if w not in stopwords}


def validate_consulta(consulta: str, concept: str) -> tuple[bool, str]:
    """Valida la consulta generada por el LLM.

    Rechaza:
    - URLs (oracle.com, http...)
    - SQL o fragmentos de código
    - Signos o fórmulas de pregunta
    - Más de 12 palabras o vacía
    - Frases en español para bancos en inglés
    - Sin sustantivos relacionados con el tema
    """
    q = (consulta or "").strip()
    if not q:
        return False, "consulta_vacia"

    if _URL_RE.search(q):
        return False, "contiene_url"

    if _SQL_RE.search(q):
        return False, "contiene_sql"

    if _CODE_RE.search(q):
        return False, "contiene_codigo"

    if _QUESTION_RE.search(q):
        return False, "contiene_pregunta"

    words = q.split()
    if len(words) > 12:
        return False, f"longitud_excesiva ({len(words)} palabras > 12)"

    # Detección de oraciones en español (bancos de fotos son en inglés)
    spanish_matches = _SPANISH_STOPWORDS_RE.findall(q)
    if len(spanish_matches) >= 2 or any(c in q for c in "áéíóúñÁÉÍÓÚÑ¿¡"):
        return False, "frase_en_espanol"

    # Control de relación con el tema: al menos una palabra debe asociarse al concepto
    stems = extract_topic_stems(concept)
    q_norm = _strip_accents(q)
    q_words = set(re.findall(r"[a-z0-9]{3,}", q_norm))

    # Mapear stems a inglés para comprobar coincidencia
    stems_en = set()
    for s in stems:
        stems_en.add(s)
        if s in _WORD_TRANSLATIONS:
            stems_en.add(_WORD_TRANSLATIONS[s])

    matches = q_words & stems_en
    # Si no hay coincidencia directa de stems, verificar si contiene alguna marca/tecnología del tema
    if not matches:
        # Chequeo contra el glosario
        concept_norm = _strip_accents(concept)
        has_glossary_match = False
        for pattern, eng_phrase in _GLOSSARY_MAP:
            if re.search(pattern, concept_norm):
                eng_tokens = set(re.findall(r"[a-z0-9]{3,}", eng_phrase))
                if q_words & eng_tokens:
                    has_glossary_match = True
                    break
        if not has_glossary_match:
            return False, "sin_sustantivos_del_tema"

    return True, "valida"


def build_deterministic_query(concept: str, descripcion: str = "") -> str:
    """Construye una consulta determinista en inglés (2-5 sustantivos técnicos).

    Utiliza el glosario técnico y traducción directa de términos nucleares.
    """
    text = f"{concept} {descripcion}".strip()
    norm = _strip_accents(text)

    # 1. Búsqueda de coincidencia en el glosario de temas
    for pattern, eng_keywords in _GLOSSARY_MAP:
        if re.search(pattern, norm):
            return eng_keywords

    # 2. Traducción de términos clave identificados
    stems = extract_topic_stems(concept)
    translated_tokens: list[str] = []
    seen = set()

    for s in stems:
        en_word = _WORD_TRANSLATIONS.get(s, s)
        if en_word not in seen:
            seen.add(en_word)
            translated_tokens.append(en_word)

    if not translated_tokens:
        translated_tokens = ["computer", "technology", "server"]

    # Agregar sufijo técnico descriptivo si es muy corta
    if len(translated_tokens) < 3:
        translated_tokens.append("technology")

    return " ".join(translated_tokens[:5])


def build_concrete_scene_subject(concept: str, descripcion: str = "") -> str:
    """Construye el sujeto concreto derivado del tema para generación visual.

    Garantiza una escena física o técnica concreta (servidores en rack, técnico,
    estación de trabajo) en vez de abstracciones, preguntas o casitas/niños.
    """
    norm = _strip_accents(f"{concept} {descripcion}")

    if re.search(r"centros? de datos|datacenter|servidores?|bases? de datos|postgresql|sql|almacenamiento|redis|mongodb", norm):
        return "servers in a datacenter rack with glowing status indicator lights and cable management"
    if re.search(r"redes?|telecomunicaciones|switches?|fibra [oó]ptica|cableado|wifi", norm):
        return "network engineer patching fiber optic cables into enterprise rack switches"
    if re.search(r"ciberseguridad|cifrado|seguridad|criptograf[ií]a", norm):
        return "cybersecurity engineer analyzing encrypted data streams on multiple workstation monitors"
    if re.search(r"contenedores?|docker|kubernetes|cloud|virtualizaci[oó]n", norm):
        return "cloud infrastructure server blade chassis running enterprise container hardware"
    if re.search(r"procesador|cpu|circuitos?|arquitectura de computadoras?|motherboard", norm):
        return "a computer motherboard with silicon microprocessor chip and electronic bus circuits"
    if re.search(r"linux|kernel|sistema operativo|terminal", norm):
        return "a computer workstation running system terminal diagnostics in a modern engineering lab"
    if re.search(r"git|control de versiones|python|desarrollo|software", norm):
        return "a software developer workstation with dual monitors displaying structured code"
    if re.search(r"superc[oó]mputo|gpu|ia|inteligencia artificial", norm):
        return "high density GPU compute clusters in a liquid cooled modern datacenter room"
    if re.search(r"blockchain|cadena de bloques", norm):
        return "distributed network compute nodes validating cryptographic transaction blocks"
    if re.search(r"auditor[ií]a|cumplimiento|normativ[oa]", norm):
        return "a technical specialist reviewing compliance reports and server architecture diagrams"

    # Sujeto genérico profesional para cualquier otro tema de computación
    query_terms = build_deterministic_query(concept, descripcion)
    return f"a technical educator explaining {query_terms} on an interactive digital whiteboard"


def sanitize_image_request(request: ImageRequest) -> ImageRequest:
    """Valida la consulta de ImageRequest y la reconstruye deterministamente si es inválida."""
    from llm.images.sources.contract import ImageRequest

    if request.consulta_replaced:
        return request

    orig_q = request.original_consulta or request.consulta
    is_valid, reason = validate_consulta(request.consulta, request.concept)
    if is_valid:
        return ImageRequest(
            tipo=request.tipo,
            descripcion=request.descripcion,
            consulta=request.consulta,
            marca=request.marca,
            diagrama=request.diagrama,
            concept=request.concept,
            template_key=request.template_key,
            width=request.width,
            height=request.height,
            used_hashes=request.used_hashes,
            original_consulta=orig_q,
            consulta_replaced=False,
            replacement_reason="valida",
        )

    deterministic_query = build_deterministic_query(request.concept, request.descripcion)
    return ImageRequest(
        tipo=request.tipo,
        descripcion=request.descripcion or request.concept,
        consulta=deterministic_query,
        marca=request.marca,
        diagrama=request.diagrama,
        concept=request.concept,
        template_key=request.template_key,
        width=request.width,
        height=request.height,
        used_hashes=request.used_hashes,
        original_consulta=orig_q,
        consulta_replaced=True,
        replacement_reason=reason,
    )
