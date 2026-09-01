import json
def verify_dataset(file_path="member1_dataset.json"):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print(f"Total instances loaded: {len(data)}")
    valid_count = 0
    
    for idx, item in enumerate(data):
        has_repo = bool(item.get("repo_name"))
        has_commit = bool(item.get("commit_sha"))
        has_cmd = bool(item.get("failing_test_command"))
        has_patch = bool(item.get("ground_truth_patch"))
        has_log = bool(item.get("raw_error_log"))
        
        if all([has_repo, has_commit, has_cmd, has_patch, has_log]):
            valid_count += 1
            
    print(f"Verified instances adhering to schema: {valid_count}/{len(data)}")

if __name__ == "__main__":
    verify_dataset()