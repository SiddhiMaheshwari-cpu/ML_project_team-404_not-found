
from integrated_pipeline import analyze_error

log = '''Traceback (most recent call last):
  File "sample.py", line 2, in run
    x = missing_function()
NameError: name 'missing_function' is not defined'''

result = analyze_error(".", log)

print("Context:", result["context"])
print("Similar bugs:", len(result["similar_bugs"]))

for bug in result["similar_bugs"]:
    print("Bug ID:", bug["bug_id"])
