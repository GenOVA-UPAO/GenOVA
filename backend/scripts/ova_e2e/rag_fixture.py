"""Genera un PDF mínimo, válido y con texto extraíble, sin dependencias externas.

Sirve para alimentar el pipeline RAG (parse → chunk → embed) de forma
determinista. El texto por defecto describe el tema del prompt para que el
contexto recuperado sea relevante.
"""


def _para(topic: str) -> list[str]:
    return [
        f"Documento de referencia: {topic}.",
        "",
        f"Este material explica los fundamentos de {topic} para un curso",
        "universitario. Define los conceptos clave, su intuicion, un ejemplo",
        "numerico sencillo y los errores comunes que cometen los estudiantes.",
        "",
        "Objetivos de aprendizaje:",
        f"- Comprender que es {topic} y para que sirve.",
        "- Identificar sus componentes y supuestos principales.",
        "- Aplicarlo a un caso practico y evaluar el resultado.",
        "",
        f"Conclusion: {topic} es una herramienta central que conecta la teoria",
        "con la practica y se evalua midiendo el error sobre datos nuevos.",
    ]


def _escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _content_stream(lines: list[str]) -> bytes:
    parts = ["BT", "/F1 12 Tf", "72 720 Td", "14 TL"]
    for i, line in enumerate(lines):
        if i > 0:
            parts.append("T*")
        parts.append(f"({_escape(line)}) Tj")
    parts.append("ET")
    return ("\n".join(parts)).encode("latin-1", "replace")


def make_sample_pdf(topic: str) -> bytes:
    """Construye un PDF de una página con el texto del tema. xref correcto."""
    content = _content_stream(_para(topic))
    objs = [
        b"<</Type/Catalog/Pages 2 0 R>>",
        b"<</Type/Pages/Kids[3 0 R]/Count 1>>",
        b"<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]"
        b"/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
        b"<</Length " + str(len(content)).encode() + b">>\nstream\n" + content + b"\nendstream",
        b"<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objs, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_pos = len(out)
    n = len(objs) + 1
    out += f"xref\n0 {n}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<</Size {n}/Root 1 0 R>>\nstartxref\n{xref_pos}\n%%EOF".encode()
    return bytes(out)
