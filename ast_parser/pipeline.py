from ast_parser.error_parser import parse_traceback
from ast_parser.context_extractor import get_code_context_by_line


def extract_context_from_error(repo_path, error_log):
    # Extract file path and line number
    location = parse_traceback(error_log)

    # If traceback information was not found
    if location is None:
        return None

    # Extract the relevant code using AST
    code_context = get_code_context_by_line(
        repo_path,
        location["file_path"],
        location["line_number"]
    )

    # Return all useful information
    return {
        "file_path": location["file_path"],
        "line_number": location["line_number"],
        "code_context": code_context
    }