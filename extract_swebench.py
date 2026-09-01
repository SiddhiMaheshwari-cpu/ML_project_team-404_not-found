import json
import urllib.request
import os

def extract_swebench_samples(num_samples=40, output_file="member1_dataset.json"):
    print("Fetching SWE-bench Lite data via Hugging Face API (No PyArrow needed)...")
    
    # Hugging Face Serverless Dataset API URL
    url = f"https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test&offset=0&limit={num_samples}"
    
    req = urllib.request.Request(
        url, 
        headers={"User-Agent": "Mozilla/5.0"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching data from API: {e}")
        return

    rows = data.get("rows", [])
    extracted_records = []

    for item_data in rows:
        item = item_data.get("row", {})
        
        instance_id = str(item.get("instance_id") or "")
        repo = str(item.get("repo") or "")
        base_commit = str(item.get("base_commit") or "")
        patch = str(item.get("patch") or "").strip()
        problem_statement = str(item.get("problem_statement") or "").strip()
        test_patch = str(item.get("test_patch") or "").strip()
        fail_to_pass = item.get("FAIL_TO_PASS") or []
        
        if fail_to_pass:
            if isinstance(fail_to_pass, str):
                try:
                    failing_tests_list = json.loads(fail_to_pass)
                except Exception:
                    failing_tests_list = [fail_to_pass]
            elif isinstance(fail_to_pass, list):
                failing_tests_list = [str(t) for t in fail_to_pass]
            else:
                failing_tests_list = [str(fail_to_pass)]
            
            test_targets = " ".join(failing_tests_list)
            failing_test_cmd = "pytest " + test_targets
        else:
            failing_test_cmd = "pytest tests/"

        record = {
            "instance_id": instance_id,
            "repo_name": repo,
            "commit_sha": base_commit,
            "failing_test_command": failing_test_cmd,
            "test_patch": test_patch,
            "raw_error_log": problem_statement,
            "ground_truth_patch": patch
        }
        
        if repo and base_commit and problem_statement:
            extracted_records.append(record)

    # Save to JSON
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, output_file)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(extracted_records, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully extracted and saved {len(extracted_records)} verified bug instances to '{output_file}'.")

if __name__ == "__main__":
    extract_swebench_samples(num_samples=40)