from integrated_pipeline import analyze_error
import pytest

from ast_parser.context_extractor import (
    get_code_context,
    get_code_context_by_line,
)
from ast_parser.error_parser import parse_traceback
from ast_parser.pipeline import extract_context_from_error


def test_get_code_context():
    code = get_code_context(
        ".",
        "ast_parser/context_extractor.py",
        "parse_python_file",
    )
    assert "def parse_python_file" in code
    assert "source_code.encode" in code


def test_get_code_context_by_line():
    code = get_code_context_by_line(
        ".",
        "ast_parser/context_extractor.py",
        17,
    )
    assert "def parse_python_file" in code


def test_parse_traceback():
    result = parse_traceback(
        'File "example.py", line 12, in example'
    )
    assert result == {
        "file_path": "example.py",
        "line_number": 12,
    }


def test_parse_traceback_without_traceback():
    assert parse_traceback("Something went wrong") is None


def test_pipeline():
    result = extract_context_from_error(
        ".",
        'File "ast_parser/context_extractor.py", '
        'line 17, in parse_python_file',
    )
    assert result is not None
    assert result["line_number"] == 17
    assert "def parse_python_file" in result["code_context"]


def test_missing_file():
    with pytest.raises(FileNotFoundError):
        get_code_context(".", "missing_file.py", "example")
def test_integrated_pipeline_with_missing_file():
    error_log = '''Traceback (most recent call last):
  File "sample.py", line 2, in run
    x = missing_function()
NameError: name 'missing_function' is not defined'''

    result = analyze_error(".", error_log)

    assert result["context"] is None
    assert len(result["similar_bugs"]) == 2
