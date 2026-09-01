from pathlib import Path

from barabar.core.exceptions import EXCEPTION_SPECS, V1_TYPES, ExceptionType, render_exceptions_md


def test_every_type_has_a_spec() -> None:
    assert set(EXCEPTION_SPECS) == set(ExceptionType)


def test_v1_types_exclude_stretch() -> None:
    assert ExceptionType.INTL_FX not in V1_TYPES
    assert ExceptionType.MARKETPLACE_TDS_TCS not in V1_TYPES
    assert len(V1_TYPES) == 23


def test_docs_in_sync_with_enum() -> None:
    doc = Path(__file__).resolve().parents[2] / "docs" / "EXCEPTIONS.md"
    assert doc.read_text(encoding="utf-8") == render_exceptions_md(), "run: make docs"
