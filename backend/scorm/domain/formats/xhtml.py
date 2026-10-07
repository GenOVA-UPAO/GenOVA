"""Conversión de los documentos HTML de las fases a XHTML bien formado (EPUB 3).

Los recursos los genera la IA como HTML5 "de navegador": etiquetas sin cerrar,
atributos de frameworks (`@click`, `:class`), comentarios con `--`, SVG en línea…
Se parsean con el parser HTML de lxml (tolerante) y se reconstruye un árbol XML
con los espacios de nombres correctos (XHTML, SVG, MathML), que después se
serializa como XML. Lo que no tiene representación XML se descarta.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from lxml import etree
from lxml import html as lxml_html

XHTML_NS = "http://www.w3.org/1999/xhtml"
SVG_NS = "http://www.w3.org/2000/svg"
MATHML_NS = "http://www.w3.org/1998/Math/MathML"
XLINK_NS = "http://www.w3.org/1999/xlink"
XML_NS = "http://www.w3.org/XML/1998/namespace"
EPUB_NS = "http://www.idpf.org/2007/ops"

# Nombre XML sin prefijo (NCName, versión ASCII + letras Unicode).
_NCNAME = re.compile(r"^[^\W\d.-][\w.-]*$")
# Caracteres no permitidos en XML 1.0.
_INVALID_XML_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]")
_XML_DECLARATION = re.compile(r"^\s*<\?xml[^>]*\?>", re.IGNORECASE)

# El parser HTML pasa a minúsculas etiquetas y atributos; SVG distingue mayúsculas.
# Tablas de ajuste del algoritmo de parsing de HTML (WHATWG, "adjust SVG …").
_SVG_TAG_NAMES = (
    "altGlyph altGlyphDef altGlyphItem animateColor animateMotion animateTransform "
    "clipPath feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix "
    "feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA "
    "feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology "
    "feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence "
    "foreignObject glyphRef linearGradient radialGradient textPath"
)
_SVG_ATTR_NAMES = (
    "attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits "
    "diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits "
    "kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust "
    "limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits "
    "numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX "
    "pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY "
    "repeatCount repeatDur requiredExtensions requiredFeatures specularConstant "
    "specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale "
    "systemLanguage tableValues targetX targetY textLength viewBox viewTarget "
    "xChannelSelector yChannelSelector zoomAndPan"
)
_SVG_TAGS = {name.lower(): name for name in _SVG_TAG_NAMES.split()}
_SVG_ATTRS = {name.lower(): name for name in _SVG_ATTR_NAMES.split()}
_PREFIXED_ATTRS = {
    "xlink:href": f"{{{XLINK_NS}}}href",
    "xlink:title": f"{{{XLINK_NS}}}title",
    "xml:lang": f"{{{XML_NS}}}lang",
    "xml:space": f"{{{XML_NS}}}space",
}
# Atributos de URL que cargan un recurso (no los enlaces <a href>).
_REMOTE_REF = re.compile(
    r"""<(?!a[\s>])[a-z][^>]*?\s(?:src|href|data|poster)\s*=\s*["']?(?:https?:)?//""",
    re.IGNORECASE,
)


def _clean(text: str | None) -> str | None:
    if text is None:
        return None
    return _INVALID_XML_CHARS.sub("", text)


def _target_ns(tag: str, parent_ns: str) -> str:
    if tag == "svg":
        return SVG_NS
    if tag == "math":
        return MATHML_NS
    return parent_ns


def _append_text(parent, previous, text: str | None) -> None:
    """Pega `text` tras `previous` (o al inicio de `parent` si no hay hermano previo)."""
    if not text:
        return
    if previous is not None:
        previous.tail = (previous.tail or "") + text
    else:
        parent.text = (parent.text or "") + text


def _new_element(parent, html_tag: str, parent_ns: str):
    tag = html_tag.lower()
    ns = _target_ns(tag, parent_ns)
    if not _NCNAME.match(tag):
        tag = "span"  # p. ej. <o:p> de Word: conservar su texto
    if ns == SVG_NS:
        tag = _SVG_TAGS.get(tag, tag)
    nsmap = None
    if ns != parent_ns:
        nsmap = {None: ns, "xlink": XLINK_NS} if ns == SVG_NS else {None: ns}
    return etree.SubElement(parent, f"{{{ns}}}{tag}", nsmap=nsmap), ns


def _copy(src, parent, parent_ns: str) -> None:
    """Copia los hijos de `src` (árbol HTML) bajo `parent` (árbol XML)."""
    previous = None
    for child in src:
        tail = _clean(child.tail)
        if not isinstance(child.tag, str):  # comentarios, PIs, entidades: sólo su cola
            _append_text(parent, previous, tail)
            continue
        element, ns = _new_element(parent, child.tag, parent_ns)
        for name, value in child.attrib.items():
            key = _attribute_key(name, ns)
            if key is not None:
                element.set(key, _clean(value) or "")
        element.text = _clean(child.text)
        # Dentro de <foreignObject> vuelve el contenido HTML.
        is_foreign = etree.QName(element).localname == "foreignObject"
        _copy(child, element, XHTML_NS if is_foreign else ns)
        element.tail = tail
        previous = element


def _attribute_key(name: str, ns: str) -> str | None:
    lowered = name.lower()
    if lowered in _PREFIXED_ATTRS:
        return _PREFIXED_ATTRS[lowered]
    if lowered == "xmlns" or lowered.startswith("xmlns:") or not _NCNAME.match(name):
        return None  # `@click`, `:class`, `x-on:click`… no son nombres XML
    if ns == SVG_NS:
        return _SVG_ATTRS.get(lowered, name)
    if lowered == "definitionurl" and ns == MATHML_NS:
        return "definitionURL"
    return name


@dataclass(frozen=True, slots=True)
class XhtmlPage:
    xhtml: str
    scripted: bool  # tiene <script>, manejadores on* o formularios (EPUB "scripted")
    remote_resources: bool  # carga recursos remotos (EPUB "remote-resources")
    svg: bool = False  # contiene SVG en línea (EPUB "svg")


# Roles ARIA que XHTML/EPUB admite en <ul>/<ol>; cualquier otro rompe la validación.
_LIST_ROLES = {
    "group", "list", "listbox", "menu", "menubar", "none", "presentation",
    "radiogroup", "tablist", "toolbar", "tree",
}


def _epub_conformance(head, body) -> None:
    """Ajustes para epubcheck sin cambiar lo que ve el lector:
    `<style>` del cuerpo al `<head>` (en XHTML solo vale ahí) y roles no
    admitidos en listas (p. ej. `role="log"` en un `<ul>`; `aria-live` se conserva)."""
    style_tag = f"{{{XHTML_NS}}}style"
    for style in list(body.iter(style_tag)):
        parent = style.getparent()
        if style.tail:
            _append_text(parent, style.getprevious(), style.tail)
            style.tail = None
        parent.remove(style)
        head.append(style)
    for tag in ("ul", "ol"):
        for element in body.iter(f"{{{XHTML_NS}}}{tag}"):
            role = (element.get("role") or "").strip()
            if role and not set(role.split()) & _LIST_ROLES:
                del element.attrib["role"]


def html_to_xhtml(document: str, title: str, lang: str = "es") -> XhtmlPage:
    """Convierte un documento HTML en XHTML5 (con declaración XML y DOCTYPE)."""
    source = _XML_DECLARATION.sub("", document or "", count=1).strip() or "<p></p>"
    parsed = lxml_html.document_fromstring(source)

    root = etree.Element(f"{{{XHTML_NS}}}html", nsmap={None: XHTML_NS, "epub": EPUB_NS})
    page_lang = parsed.get("lang") or lang
    root.set("lang", page_lang)
    root.set(f"{{{XML_NS}}}lang", page_lang)

    head_src = parsed.find("head")
    body_src = parsed.find("body")
    head = etree.SubElement(root, f"{{{XHTML_NS}}}head")
    if head_src is not None:
        _copy(head_src, head, XHTML_NS)
    if head.find(f"{{{XHTML_NS}}}title") is None:
        title_el = etree.Element(f"{{{XHTML_NS}}}title")
        title_el.text = _clean(title)
        head.insert(0, title_el)
    elif not (head.find(f"{{{XHTML_NS}}}title").text or "").strip():
        head.find(f"{{{XHTML_NS}}}title").text = _clean(title)

    body = etree.SubElement(root, f"{{{XHTML_NS}}}body")
    if body_src is not None:
        for name, value in body_src.attrib.items():
            key = _attribute_key(name, XHTML_NS)
            if key is not None:
                body.set(key, _clean(value) or "")
        body.text = _clean(body_src.text)
        _copy(body_src, body, XHTML_NS)
    _epub_conformance(head, body)

    serialized = etree.tostring(root, encoding="unicode", method="xml")
    return XhtmlPage(
        xhtml=f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n{serialized}\n',
        scripted=_is_scripted(root),
        remote_resources=bool(_REMOTE_REF.search(serialized)),
        svg=any(element.tag == f"{{{SVG_NS}}}svg" for element in root.iter()),
    )


def _is_scripted(root) -> bool:
    scripted_tags = {f"{{{XHTML_NS}}}{t}" for t in ("script", "form")}
    scripted_tags.add(f"{{{SVG_NS}}}script")
    for element in root.iter():
        if element.tag in scripted_tags:
            return True
        if any(str(key).lower().startswith("on") for key in element.attrib):
            return True
    return False
