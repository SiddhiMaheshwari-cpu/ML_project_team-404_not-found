from ast_parser.pipeline import extract_context_from_error


error_log = 'File "ast_parser/context_extractor.py", line 17, in parse_python_file'

result = extract_context_from_error(
    ".",
    error_log
)

print("File:", result["file_path"])
print("Line:", result["line_number"])
print("Code context:")
print(result["code_context"])