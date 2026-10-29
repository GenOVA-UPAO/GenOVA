"""IEEE LOM v1.0, compartido por los manifiestos SCORM e IMS."""

from xml.sax.saxutils import escape, quoteattr

from core.educational_metadata import EducationalMetadata


def build_lom(title: str, metadata: EducationalMetadata | None = None) -> str:
    meta = metadata or EducationalMetadata()

    def lang_string(value: str) -> str:
        return f'<lom:string language={quoteattr(meta.language)}>{escape(value)}</lom:string>'

    keywords = "".join(f"<lom:keyword>{lang_string(k)}</lom:keyword>" for k in meta.keywords)
    # LOM exige una entidad vCard, no un nombre suelto.
    author = meta.author.replace("\\", "\\\\").replace("\n", "\\n").replace("\r", "")
    author = author.replace(";", "\\;").replace(",", "\\,")
    entity = escape(f"BEGIN:VCARD\nVERSION:3.0\nFN:{author}\nEND:VCARD")
    contribute = (
        '<lom:lifeCycle><lom:contribute><lom:role><lom:source>LOMv1.0</lom:source>'
        '<lom:value>author</lom:value></lom:role>'
        f'<lom:entity>{entity}</lom:entity></lom:contribute></lom:lifeCycle>'
    ) if meta.author else ""
    context = (
        '<lom:context><lom:source>GenOVA</lom:source>'
        f'<lom:value>{escape(meta.educational_level)}</lom:value></lom:context>'
    ) if meta.educational_level else ""
    audience = f'<lom:description>{lang_string(meta.audience)}</lom:description>' if meta.audience else ""
    duration = (
        f'<lom:typicalLearningTime><lom:duration>{escape(meta.typical_learning_time)}</lom:duration>'
        '</lom:typicalLearningTime>'
    ) if meta.typical_learning_time else ""
    restricted = "no" if meta.license == "CC0 1.0" else "yes"
    return f'''<lom:lom xmlns:lom="http://ltsc.ieee.org/xsd/LOM">
      <lom:general>
        <lom:title>{lang_string(title)}</lom:title>
        <lom:language>{escape(meta.language)}</lom:language>
        <lom:description>{lang_string(meta.description or "")}</lom:description>
        {keywords}
      </lom:general>
      {contribute}
      <lom:educational>{context}{duration}{audience}</lom:educational>
      <lom:rights>
        <lom:copyrightAndOtherRestrictions><lom:source>LOMv1.0</lom:source><lom:value>{restricted}</lom:value></lom:copyrightAndOtherRestrictions>
        <lom:description>{lang_string(meta.license)}</lom:description>
      </lom:rights>
    </lom:lom>'''
