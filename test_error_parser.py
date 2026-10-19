from ast_parser.error_parser import parse_traceback


error_log = 'File "src/requests/models.py", line 123, in some_function'

result = parse_traceback(error_log)

print(result)