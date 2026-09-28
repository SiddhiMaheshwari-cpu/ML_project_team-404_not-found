import re


def parse_traceback(error_log):
    """
    Extract the file path and line number
    from a Python traceback.
    """

    pattern = r'File "([^"]+)", line (\d+)'

    matches = re.findall(pattern, error_log)

    if not matches:
        return None

    file_path, line_number = matches[-1]

    return {
        "file_path": file_path,
        "line_number": int(line_number)
    }