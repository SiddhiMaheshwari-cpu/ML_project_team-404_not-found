
import json
import chromadb
from sentence_transformers import SentenceTransformer

DATASET_PATH = "member1_dataset.json"
DB_PATH = "./chroma_bug_memory"
COLLECTION_NAME = "swebench_bugs"

# Load the embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create a local vector database
client = chromadb.PersistentClient(path=DB_PATH)

collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)


def load_bug_memory():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        samples = json.load(file)

    ids = []
    documents = []
    metadatas = []

    for item in samples:
        error_text = item.get("raw_error_log", "").strip()
        patch = item.get("ground_truth_patch", "").strip()

        if not error_text or not patch:
            continue

        bug_id = item.get("instance_id")
        if not bug_id:
            continue

        ids.append(bug_id)
        documents.append(error_text)
        metadatas.append({
            "repo_name": item.get("repo_name", ""),
            "commit_sha": item.get("commit_sha", ""),
            "ground_truth_patch": patch,
            "failing_test_command": item.get(
                "failing_test_command", ""
            ),
        })

    if not ids:
        raise ValueError("No valid bug examples found in dataset.")

    # Convert error descriptions into embeddings
    embeddings = model.encode(documents).tolist()

    # Store or update the examples in ChromaDB
    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    return len(ids)


if __name__ == "__main__":
    count = load_bug_memory()
    print(f"Stored {count} bug examples in ChromaDB.")
