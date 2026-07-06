"""Regression: el splitter de migraciones no debe cortar bloques dollar-quoted.

2026-07-06: la 018 reescrita como `DO $$ ... $$;` fallaba con
"unterminated dollar-quoted string" porque _split_statements partía por `;`
dentro del cuerpo del DO.
"""

from pathlib import Path

from run_migrations import _split_statements


def test_do_block_stays_single_statement():
    sql = """
-- comentario
CREATE TABLE foo (id int);
DO $$
DECLARE t text;
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
END $$;
INSERT INTO foo VALUES (1);
"""
    stmts = _split_statements(sql)
    assert len(stmts) == 3
    assert stmts[1].startswith("DO $$")
    assert stmts[1].endswith("END $$")


def test_tagged_dollar_quote():
    sql = "DO $body$ BEGIN PERFORM 1; END $body$; SELECT 2;"
    stmts = _split_statements(sql)
    assert len(stmts) == 2
    assert "PERFORM 1;" in stmts[0]


def test_migration_018_splits_to_one_statement():
    sql = (Path(__file__).parent.parent / "migrations" / "018_enable_rls.sql").read_text(
        encoding="utf-8"
    )
    stmts = _split_statements(sql)
    assert len(stmts) == 1
    assert stmts[0].startswith("DO $$")
