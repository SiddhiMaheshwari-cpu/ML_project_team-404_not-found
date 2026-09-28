import json
from ast_parser.context_extractor import get_code_context_by_line


# Load the dataset
with open("member2_ci_ast_samples.json", "r", encoding="utf-8") as file:
    samples = json.load(file)


# Take the first sample
sample = samples[0]

print("Repository:", sample["repo_name"])
print("File:", sample["failing_file"])
print("Failing line:", sample["failing_line"])

print("\nTrying to extract code context...")


# IMPORTANT:
# This assumes the repository mentioned in the dataset
# is available locally.
repo_path = "."

try:
    code_context = get_code_context_by_line(
        repo_path,
        sample["failing_file"],
        sample["failing_line"]
    )

    print("\nCode context:")
    print("--------------------")
    print(code_context)
    print("--------------------")

except FileNotFoundError:
    print("\nFile not found.")
    print("The actual repository for this dataset sample is not")
    print("available inside the current project folder.")

except Exception as error:
    print("\nError:")
    print(error)