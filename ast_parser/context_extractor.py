from pathlib import Path
from tree_sitter import Language, Parser
import tree_sitter_python


# Load Python language
PY_LANGUAGE = Language(tree_sitter_python.language())

# Create Tree-sitter parser
parser = Parser(PY_LANGUAGE)


def parse_python_file(repo_path, file_path):
    # Create the complete file path
    full_path = Path(repo_path) / file_path

    # Check if the file exists
    if not full_path.exists():
        raise FileNotFoundError(f"File not found: {full_path}")

    # Read the Python file
    source_code = full_path.read_text(encoding="utf-8")

    # Convert source code into bytes
    source_bytes = source_code.encode("utf-8")

    # Parse the Python code
    tree = parser.parse(source_bytes)

    return tree, source_code


def find_definition(node, source_code, function_name):
    # Check if current node is a function or class
    if node.type in ("function_definition", "class_definition"):

        name_node = node.child_by_field_name("name")

        if name_node is not None:
            name = source_code[
                name_node.start_byte:name_node.end_byte
            ]

            if name == function_name:
                return node

    # Search child nodes
    for child in node.children:
        result = find_definition(
            child,
            source_code,
            function_name
        )

        if result is not None:
            return result

    return None


def get_code_context(repo_path, file_path, function_name):
    # Parse the Python file
    tree, source_code = parse_python_file(
        repo_path,
        file_path
    )

    # Find function or class
    node = find_definition(
        tree.root_node,
        source_code,
        function_name
    )

    if node is None:
        raise ValueError(
            f"Function or class '{function_name}' not found"
        )

    # Extract actual source code
    code_context = source_code[
        node.start_byte:node.end_byte
    ]

    return code_context


def find_enclosing_definition(node, error_line):
    # Tree-sitter uses 0-based line numbers.
    # Our error_line is a normal 1-based line number.

    start_line = node.start_point[0] + 1
    end_line = node.end_point[0] + 1

    # Check whether this node contains the error line
    if start_line <= error_line <= end_line:

        # Search deeper first
        for child in node.children:
            result = find_enclosing_definition(
                child,
                error_line
            )

            if result is not None:
                return result

        # Return the function/class containing the line
        if node.type in (
            "function_definition",
            "class_definition"
        ):
            return node

    return None


def get_code_context_by_line(repo_path, file_path, error_line):
    # Parse the Python file
    tree, source_code = parse_python_file(
        repo_path,
        file_path
    )

    # Find the function/class containing the error line
    node = find_enclosing_definition(
        tree.root_node,
        error_line
    )

    # If the line is not inside a function/class,
    # return the complete file.
    if node is None:
        return source_code

    # Extract the relevant code
    code_context = source_code[
        node.start_byte:node.end_byte
    ]

    return code_context