"""Shared utilities for all phase generation routers."""

import json
import re

from llm.utils.themes import build_design_system

SCORM_JS = (
    'function _scormInit(){if(window.API)window.API.LMSInitialize("")}'
    "function _scormComplete(s){if(window.API){"
    'if(s!=null)window.API.LMSSetValue("cmi.core.score.raw",s);'
    'window.API.LMSSetValue("cmi.core.lesson_status","completed");'
    'window.API.LMSCommit("");window.API.LMSFinish("")}}'
    'window.addEventListener("load",_scormInit)'
)

# Default design system (UPAO color + UPAO design). Injected into every
# HTML-generating prompt that doesn't pass an explicit themed `design_system`.
# Non-Prometheus callers (labs, regen, legacy routers) keep using this default;
# the Prometheus plans pass a per-job themed string via build_design_system().
DESIGN_SYSTEM = build_design_system("upao", "upao")

# Shared course context injected into every generation prompt. GenOVA targets a
# single university course (UPAO ICSI-521, Sistemas de Gestión de Base de Datos,
# Oracle-based DBA focus), so audience, syllabus and technical conventions are
# constant — the only variable is the specific DBMS concept in the user prompt.
# The syntax reference comes from the course's own lab scripts and fixes the
# API mistakes models made in testing (DBMS_JOB vs DBMS_SCHEDULER, quoted
# passwords).
CURSO_CONTEXTO = (
    "Recurso para el curso universitario «Sistemas de Gestión de Base de Datos» "
    "(UPAO, Ing. de Computación y Sistemas, 5.º ciclo), orientado a la "
    "administración de bases de datos (rol del DBA) sobre Oracle 11g o superior. "
    "Audiencia: estudiantes que ya saben SQL básico (SELECT, JOIN, DDL) y "
    "modelado relacional, pero que se inician en la administración del SGBD. "
    "Temario: U1 — rol y funciones del DBA; arquitectura ANSI/SPARC y de Oracle "
    "(instancia, SGA: shared pool, buffer cache, redo log buffer; PGA; procesos "
    "DBWR, LGWR, CKPT, SMON, PMON, ARCH); almacenamiento interno (memoria, redo "
    "log, archivo de control, archivo de parámetros, diccionario de datos) y "
    "externo (tablespaces, datafiles, RAID, métodos de acceso); objetos "
    "(segmentos, extents, bloques, tablas, vistas, índices, secuencias, "
    "sinónimos); control de concurrencia (transacciones, serializabilidad, "
    "bloqueos, bloqueo en dos fases, interbloqueos, niveles de aislamiento). "
    "U2 — seguridad (usuarios, roles, perfiles, privilegios GRANT/REVOKE); "
    "auditoría (AUDIT, AUDIT_TRAIL, DBA_AUDIT_*); backup y recuperación (frío/"
    "caliente, completo/incremental/diferencial, RPO/RTO, RMAN, Data Pump); "
    "optimización (álgebra relacional, procesamiento de consultas, heurísticas, "
    "planes de ejecución y costos, índices, estadísticas, EXPLAIN PLAN, trazas, "
    "Statspack); automatización de tareas (DBMS_JOB, DBMS_SCHEDULER). "
    "Idioma: español (palabras clave SQL y nombres de vistas en su forma "
    "original). El recurso debe enseñar de verdad: objetivo de aprendizaje "
    "claro, explicación correcta, ejemplos trabajados paso a paso, práctica con "
    "retroalimentación que explique el porqué y un cierre que consolide. Todo "
    "SQL o PL/SQL debe ser sintaxis Oracle válida y toda vista del diccionario "
    "(DBA_*, V$*, USER_*) debe existir de verdad. Sintaxis de referencia del "
    "curso: DBMS_JOB.SUBMIT(:job, 'bloque;', SYSDATE, 'SYSDATE+1') y "
    "DBMS_JOB.WHAT/CHANGE/REMOVE; DBMS_SCHEDULER es un paquete independiente "
    "que reemplaza a DBMS_JOB: CREATE_JOB(job_name, job_type => 'PLSQL_BLOCK', "
    "job_action, start_date, repeat_interval => 'FREQ=DAILY;BYHOUR=3') y "
    "ENABLE/DISABLE/RUN_JOB/STOP_JOB/DROP_JOB; CREATE USER jperez IDENTIFIED BY "
    "Clave123; ALTER SYSTEM SET audit_trail = DB SCOPE = SPFILE; "
    "DBMS_MONITOR.SESSION_TRACE_ENABLE(session_id, serial_num, waits, binds). "
    "Prefiere escenarios realistas de una pequeña empresa y esquemas de ejemplo "
    "conocidos (HR: EMPLOYEES, DEPARTMENTS, JOBS; o ventas: clientes, productos, "
    "pedidos). Todo ejemplo, dato, analogía o mecánica debe ser específico y "
    "fiel al concepto de SGBD indicado — nunca genérico, nunca de otro subtema y "
    "nunca de Machine Learning o ciencia de datos."
)


def format_contexto_usuario(contexto: str | None) -> str:
    """Wrap retrieved RAG context in a tagged block for prompt injection. Returns
    "" when no context was retrieved (callers concat unconditionally)."""
    if not contexto or not contexto.strip():
        return ""
    return (
        "\n[CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
        "Material de apoyo subido por el estudiante. Úsalo como referencia fiel "
        "siempre que sea coherente con la tarea pedida.\n"
        f"{contexto.strip()}\n"
        "[/CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
    )


_FENCE = re.compile(r"```[a-zA-Z0-9_-]*[ \t]*\n([\s\S]*?)\n?[ \t]*```")
_HTML_START = re.compile(r"<!doctype html|<html[\s>]", re.I)


def strip_markdown(text: str) -> str:
    """Return the payload of an LLM answer, dropping chatter around it.

    Models often wrap the document in a code fence AND add prose before or after
    it ("Here is a self-contained HTML…", "### How it works…"). The fence is
    matched anywhere (not only at the end of the text), and when several fences
    exist the longest one wins — the explanation blocks are short.
    """
    text = text.strip()
    blocks = _FENCE.findall(text)
    if blocks:
        return max(blocks, key=len).strip()
    # Unterminated fence (truncated answer): keep what follows the opener.
    text = (
        re.sub(r"^[\s\S]*?```[a-zA-Z0-9_-]*[ \t]*\n", "", text, count=1) if "```" in text else text
    )
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def extract_html_document(text: str) -> str:
    """strip_markdown + cut any prose outside <!DOCTYPE html> … </html>."""
    html = strip_markdown(text)
    start = _HTML_START.search(html)
    if start and start.start() > 0:
        html = html[start.start() :]
    end = html.lower().rfind("</html>")
    if end != -1:
        html = html[: end + len("</html>")]
    return html.strip()


def parse_json(raw: str) -> dict | list:
    """Tolerant JSON parser for LLM output.

    Strategy: strip code fences, try direct parse, then walk balanced bracket
    spans from the first `{` or `[` and try each one. Returns the first valid
    parse; raises ValueError if nothing parses.
    """
    cleaned = strip_markdown(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        while start != -1:
            depth = 0
            for i in range(start, len(cleaned)):
                c = cleaned[i]
                if c == opener:
                    depth += 1
                elif c == closer:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(cleaned[start : i + 1])
                        except json.JSONDecodeError:
                            break
            start = cleaned.find(opener, start + 1)

    raise ValueError(f"No valid JSON in response: {cleaned[:80]}")
