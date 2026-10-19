

from ast_parser.pipeline import extract_context_from_error
from retrieve_bugs import retrieve_similar_bugs
from self_learning import save_fixed_bug


def analyze_error(repo_path, error_log):
    # Step 1: Try extracting code context
    try:
        context = extract_context_from_error(repo_path, error_log)
    except (FileNotFoundError, OSError) as error:
        print("Could not extract code context:", error)
        context = None

    # Step 2: Retrieve similar bugs even if context extraction fails
    similar_bugs = retrieve_similar_bugs(error_log)

    # Step 3: Return both results
    return {
        "context": context,
        "similar_bugs": similar_bugs
    }


def learn_from_fix(bug_id, error_text, patch, tests_passed):
    return save_fixed_bug(
        bug_id,
        error_text,
        patch,
        tests_passed
    )
