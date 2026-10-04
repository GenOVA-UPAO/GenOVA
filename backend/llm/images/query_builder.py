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

def is_infrastructure_topic(concept: str, descripcion: str = "") -> bool:
    """Determina si el tema corresponde estrictamente a infraestructura física de servidores/datacenters."""
    norm = _strip_accents(f"{concept} {descripcion}").lower()
    infra_patterns = [
        r"\bcentros?\s+de\s+datos\b",
        r"\bdatacenters?\b",
        r"\bdata\s+centres?\b",
        r"\binfraestructura\s+f[ií]sica\b",
        r"\bsala\s+de\s+servidores\b",
        r"\bracks?\s+de\s+servidores\b",
        r"\bservidores?\s+de\s+alta\s+densidad\b",
        r"\bserver\s+rooms?\b",
    ]
    return any(re.search(p, norm) for p in infra_patterns)


# Glosario técnico determinista: español normalizado -> sustantivos técnicos en inglés
# Servidores se usan ÚNICAMENTE para temas de infraestructura física.
_GLOSSARY_MAP: list[tuple[str, str]] = [
    # 1. Redes / 5G / Telecomunicaciones
    (r"\b(?:5g|antenas? de telefon[ií]a|redes? m[oó]viles)\b", "cellular telecommunication tower antennas 5g"),
    (r"\b(?:redes? inal[aá]mbricas?|wifi|seguridad wifi)\b", "wifi wireless network router security ethernet"),
    (r"\b(?:redes? de computadoras?|cableado estructurado)\b", "computer networking router fiber optic cables"),
    (r"\b(?:cables? submarinos?|telecomunicaciones globales)\b", "submarine communications fiber optic cables"),
    (r"\b(?:telecomunicaciones|switches?|conmutador)\b", "telecommunications network switch router equipment"),
    (r"\b(?:fibra [oó]ptica)\b", "fiber optic optical network cables"),
    # 2. Inteligencia Artificial / Machine Learning / Robótica
    (r"\b(?:inteligencia artificial|\bia\b|aprendizaje profundo|deep learning|machine learning|redes? neuronales?)\b", "illustrated artificial neural network graph robot"),
    (r"\b(?:superc[oó]mputo|clusters? de gpu para ia|clusters? de gpu)\b", "gpu accelerator compute processor technology"),
    # 3. POO / Programación / Desarrollo de Software
    (r"\b(?:programaci[oó]n orientada a objetos|\bpoo\b|clases y objetos)\b", "object oriented programming computer screen code dark mode"),
    (r"\b(?:desarrollo de software|programaci[oó]n|codigo fuente)\b", "computer monitor displaying programming source code"),
    (r"\b(?:python)\b", "computer screen with python programming code"),
    (r"\b(?:git|control de versiones)\b", "git version control repository commit graph"),
    (r"\b(?:desarrollo [aá]gil|scrum|tablero kanban)\b", "agile kanban workflow board sticky notes"),
    (r"\b(?:algoritmos?|estructuras? de datos)\b", "computer algorithm logic flow flowchart"),
    # 4. Seguridad / Ciberseguridad / Criptografía
    (r"\b(?:ciberseguridad|seguridad informatica|cifrado de datos en reposo|cifrado de datos)\b", "physical brass padlock on computer keyboard"),
    (r"\b(?:criptograf[ií]a asim[eé]trica|\brsa\b|claves p[uú]blicas|claves rsa)\b", "cryptographic brass lock and key hardware"),
    (r"\b(?:firewall|cortafuegos|detecci[oó]n de intrusos)\b", "network firewall security protection lock"),
    (r"\b(?:cumplimiento normativo|auditor[ií]a de bases de datos)\b", "database compliance audit data security lock"),
    # 5. Bases de datos / Almacenamiento
    (r"\b(?:postgresql|postgres)\b", "postgresql relational database storage system"),
    (r"\b(?:mongodb|nosql)\b", "mongodb document database storage technology"),
    (r"\b(?:redis|almacenamiento en memoria)\b", "redis in-memory cache data storage"),
    (r"\b(?:arreglos? de discos?|raid|almacenamiento masivo|discos? duros?)\b", "hard disk drive magnetic platters storage"),
    (r"\b(?:memoria ram|almacenamiento ssd|estado solido)\b", "ram memory sticks solid state drive ssd"),
    (r"\b(?:base de datos relacional|modelo er|sql)\b", "relational database data storage system"),
    (r"\b(?:base de datos|bases de datos)\b", "database storage disk media system"),
    # 6. Hardware / Microprocesadores / CPU
    (r"\b(?:placa base|motherboard)\b", "computer motherboard electronics circuit"),
    (r"\b(?:arquitectura de computadoras?|circuitos integrados?|cpu|microprocesador)\b", "silicon microprocessor chip on motherboard circuit"),
    # 7. Sistemas Operativos / Linux / Kernel
    (r"\b(?:linux|kernel linux|sistema operativo)\b", "computer workstation monitor system terminal console"),
    # 8. Cloud / Contenedores / DevOps
    (r"\b(?:docker|contenedores?)\b", "docker container application deployment technology"),
    (r"\b(?:kubernetes|k8s)\b", "kubernetes cluster container application nodes"),
    (r"\b(?:microservicios?|servicios distribuidos)\b", "microservices distributed application network nodes"),
    (r"\b(?:infraestructura cloud|virtualizaci[oó]n)\b", "cloud computing virtualization technology infrastructure"),
    (r"\b(?:kafka|apache kafka)\b", "apache kafka event streaming data pipeline"),
    (r"\b(?:nginx)\b", "nginx web proxy networking reverse proxy"),
    (r"\b(?:cliente[\s-]servidor|protocolo http)\b", "client network web technology protocol"),
    (r"\b(?:monitoreo operativo|observabilidad)\b", "systems telemetry monitoring performance metrics"),
    # 9. Blockchain / Criptoactivos
    (r"\b(?:blockchain|cadena de bloques|contratos? inteligentes?)\b", "blockchain distributed cryptographic ledger blocks"),
    # 10. Infraestructura física / Centros de datos (ÚNICA área con servidores)
    (r"\b(?:centros? de datos|datacenter|servidores de alta densidad|servidores en rack|sala de servidores)\b", "datacenter server racks infrastructure corridor"),
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
    "antena": "antenna",
    "antenas": "antennas",
    "candado": "padlock",
    "candados": "padlocks",
    "llave": "key",
    "llaves": "keys",
    "robot": "robot",
    "robotica": "robotics",
    "neuronal": "neural",
    "pantalla": "screen",
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
        translated_tokens = ["computer", "technology", "hardware"]

    # Agregar sufijo técnico descriptivo si es muy corta
    if len(translated_tokens) < 3:
        translated_tokens.append("technology")

    return " ".join(translated_tokens[:5])


def build_concrete_scene_subject(concept: str, descripcion: str = "") -> str:
    """Construye el sujeto concreto derivado del tema para generación visual.

    Garantiza una escena física o técnica concreta acorde a cada área
    (antenas de telefonía, routers, red neuronal ilustrada, robot, pantalla con código
    sin rostro visible, candado físico y llaves, discos duros, motherboard), y SOLO
    usa servidores cuando el tema sea estrictamente de infraestructura física.
    """
    norm = _strip_accents(f"{concept} {descripcion}").lower()

    # 1. Infraestructura física de centros de datos (ÚNICA área con servidores)
    if is_infrastructure_topic(concept, descripcion):
        return "servers in a modern datacenter rack with glowing status indicator lights and cable management"

    # 2. Redes / 5G / Telecomunicaciones: antenas de telefonía, routers
    if re.search(r"\b(?:5g|antenas?|telecomunicaciones|switches?|fibra\s+[oó]ptica|cableado|wifi|redes?|conmutador)\b", norm):
        return "cellular telecommunication tower antennas and enterprise router with fiber optic cables"

    # 3. Inteligencia Artificial / Machine Learning: red neuronal ilustrada, robot
    if re.search(r"\b(?:inteligencia\s+artificial|ia\b|aprendizaje\s+profundo|deep\s+learning|machine\s+learning|redes?\s+neuronales?|robotica|robot)\b", norm):
        return "an illustrated artificial neural network graph with glowing interconnected nodes and a modern robotic arm"

    # 4. Metodologías Ágiles / Scrum / Kanban: tablero ágil
    if re.search(r"\b(?:agil|scrum|kanban|metodolog[ií]as?)\b", norm):
        return "an agile kanban workflow board with colorful sticky notes and organized sprint columns"

    # 5. POO / Programación / Desarrollo de Software: pantalla con código, persona programando sin rostro visible
    if re.search(r"\b(?:programaci[oó]n|poo|codigo|software|python|algoritmos?|git|control\s+de\s+versiones)\b", norm):
        return "a computer screen displaying programming code in dark mode, software developer seen from behind with no visible face"

    # 6. Seguridad / Ciberseguridad / Criptografía: candado/llave física
    if re.search(r"\b(?:ciberseguridad|cifrado|seguridad|criptograf[ií]a|firewall|claves\s+rsa|cortafuegos|autenticaci[oó]n)\b", norm):
        return "a physical brass padlock and keys on top of a computer keyboard symbolizing cybersecurity data protection"

    # 7. Bases de datos / SQL / Almacenamiento: platos de disco duro, circuitos SSD, almacenamiento
    if re.search(r"\b(?:bases?\s+de\s+datos|postgresql|mongodb|redis|sql|almacenamiento\s+masivo|raid|discos?|memoria\s+ram|ssd)\b", norm):
        return "an open hard disk drive showing reflective magnetic platters and actuator arm with electronic storage circuitry"

    # 8. Hardware / CPU / Microprocesadores: circuitos, microprocesador, motherboard
    if re.search(r"\b(?:procesador|cpu|circuitos?|arquitectura\s+de\s+computadoras?|motherboard|placa\s+base|microprocesador)\b", norm):
        return "a computer motherboard with silicon microprocessor chip and electronic bus circuits"

    # 9. Sistemas Operativos / Linux: pantalla con terminal de sistema
    if re.search(r"\b(?:linux|kernel|sistema\s+operativo|terminal|unix|procesos)\b", norm):
        return "a computer workstation monitor running system terminal diagnostics in a modern engineering lab"

    # 10. Cloud / Contenedores: ilustración técnica de pods y microservicios
    if re.search(r"\b(?:contenedores?|docker|kubernetes|cloud|virtualizaci[oó]n|microservicios?|servicios\s+distribuidos)\b", norm):
        return "a stylized technical illustration of interconnected cloud compute pods and container architecture"

    # 11. Blockchain / Criptoactivos: bloques interconectados
    if re.search(r"\b(?:blockchain|cadena\s+de\s+bloques|contratos?\s+inteligentes?|ledger)\b", norm):
        return "interconnected illuminated cryptographic digital blocks representing distributed ledger technology"

    # 12. Auditoría / Cumplimiento: candado y reportes
    if re.search(r"\b(?:auditor[ií]a|cumplimiento|normativ[oa])\b", norm):
        return "a computer workstation with audit compliance checklist reports and a physical security lock"

    # Sujeto temático derivado deterministamente (sin personas ni servidores)
    query_terms = build_deterministic_query(concept, descripcion)
    return f"a technical computer workstation showing {query_terms} on high resolution display screen"


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
