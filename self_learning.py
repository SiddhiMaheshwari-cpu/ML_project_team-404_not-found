
from sentence_transformers import SentenceTransformer
from bug_memory import collection

model = SentenceTransformer("all-MiniLM-L6-v2")


def save_fixed_bug(bug_id, error_text, patch, tests_passed):
    # Save only when Member 3 confirms tests passed
    if tests_passed is not True:
        print("Bug not saved: tests have not passed.")
        return False

    if not bug_id or not error_text.strip() or not patch.strip():
        print("Bug not saved: missing bug details.")
        return False

    embedding = model.encode([error_text]).tolist()[0]

    collection.upsert(
        ids=[bug_id],
        documents=[error_text],
        embeddings=[embedding],
        metadatas=[{"ground_truth_patch": patch}]
    )

    print("Bug saved successfully!")
    return True
