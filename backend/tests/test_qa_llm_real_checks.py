"""Heurísticas del QA con LLM real (scripts/qa_llm_real.py): sin red."""

import io
import zipfile

from scripts import qa_llm_real as qa

ARBOLES = (
    "Un árbol de decisión divide los datos en nodos. Cada nodo usa un atributo; "
    "la entropía y el índice Gini miden la impureza para la clasificación."
)
BOTANICA = "La fotosíntesis ocurre en la clorofila de la planta; el xilema lleva savia."
SEGURIDAD = "Un rol agrupa privilegios; con GRANT se da acceso a un usuario y la auditoría registra todo."


def test_html_to_text_quita_script_style_y_decodifica():
    raw = "<style>p{}</style><p>Caf&eacute; &amp; t&eacute;</p><script>var oracle=1</script>"
    assert qa.html_to_text(raw) == "Café & té"


def test_html_to_text_conserva_prosa_de_atributos():
    raw = '<upao-question number="1" prompt="¿Qué es un nodo hoja?" class="x y z"></upao-question>'
    assert "nodo hoja" in qa.html_to_text(raw)
    assert "x y z" not in qa.html_to_text(raw)


def test_html_to_text_ignora_meta():
    raw = '<meta name="x" content="width=device-width, initial-scale=1"><p>Hola mundo</p>'
    assert qa.html_to_text(raw) == "Hola mundo"


def test_count_term_ignora_tildes_y_subcadenas():
    assert qa.count_term("La Auditoría y la AUDITORIA", "auditoria") == 2
    assert qa.count_term("peroracle", "oracle") == 0


def test_forbidden_tolera_una_mencion_pero_no_varias():
    assert qa.check_no_forbidden("usa Oracle una vez", qa.FORBIDDEN_ORACLE, "o").ok
    assert not qa.check_no_forbidden("Oracle, Oracle y SGBD", qa.FORBIDDEN_ORACLE, "o").ok


def test_foco_arboles_ok_y_botanica_falla():
    ok = qa.check_focus(ARBOLES, qa.TREE_TERMS, qa.BOTANY_TERMS, "arboles", "botanica")
    assert all(c.ok for c in ok)
    mal = qa.check_focus(BOTANICA, qa.TREE_TERMS, qa.BOTANY_TERMS, "arboles", "botanica")
    assert not all(c.ok for c in mal)


def test_foco_seguridad_vs_transaccion():
    assert all(c.ok for c in qa.check_focus(SEGURIDAD, qa.SECURITY_TERMS, qa.TRANSACTION_TERMS, "s", "t"))
    tx = "Una transacción hace commit o rollback; las transacciones son ACID."
    assert not all(c.ok for c in qa.check_focus(tx, qa.SECURITY_TERMS, qa.TRANSACTION_TERMS, "s", "t"))


def test_count_questions():
    assert qa.count_questions("<upao-question n=1></upao-question><upao-question n=2>") == 2
    assert qa.count_questions("<p>nada</p>") == 0


def test_scorm_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("index.html", "x")
        z.writestr("resources/recurso_1.html", "x")
    assert qa.check_scorm_zip(buf.getvalue()).ok
    assert not qa.check_scorm_zip(b"no es zip").ok
    assert not qa.check_scorm_zip(None, "boom").ok


def test_content_checks_quiz_y_caso_c():
    case = qa.CASES[2]
    checks = qa.content_checks(case, SEGURIDAD, "<upao-question></upao-question>" * 4)
    assert all(c.ok for c in checks), checks
    checks = qa.content_checks(case, SEGURIDAD, "<upao-question></upao-question>" * 6)
    assert not next(c for c in checks if c.name == "quiz_preguntas").ok
