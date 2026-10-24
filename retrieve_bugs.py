
from sentence_transformers import SentenceTransformer
from bug_memory import collection

# Load the same embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def retrieve_similar_bugs(error_text, top_k=2):
    # Convert the new error into an embedding
    embedding = model.encode([error_text]).tolist()

    # Search the vector database
    results = collection.query(
        query_embeddings=embedding,
        n_results=top_k
    )

    # Display similar bugs
    bugs = []

    for i in range(len(results["ids"][0])):
        bug = {
            "bug_id": results["ids"][0][i],
            "error": results["documents"][0][i],
            "patch": results["metadatas"][0][i]["ground_truth_patch"]
        }
        bugs.append(bug)

    return bugs


if __name__ == "__main__":
    sample_error = "TypeError: unsupported operand type"
    similar_bugs = retrieve_similar_bugs(sample_error)

    for bug in similar_bugs:
        print("\nBug ID:", bug["bug_id"])
        print("Error:", bug["error"][:200])
        print("Patch:", bug["patch"][:300])
