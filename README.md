# Agentic CI/CD: Self-Healing Code Pipeline

An autonomous DevOps agent system that detects test failures in CI/CD pipelines, maps errors to code scopes using AST parsing (Tree-sitter), generates unified diff patches via LLM agents, and verifies fixes in isolated Docker sandboxes.

## Milestone 1: Benchmark Data Collection
- **Source:** Princeton SWE-bench Lite (via Hugging Face API)
- **Dataset:** 100 verified bug instances (`member1_dataset.json`)
- **Key Fields:** Repository metadata, base commit SHA, failing test command, raw traceback logs, and ground-truth patches.

## Setup & Verification

```bash
# Extract dataset
python extract_swebench.py

# Verify dataset integrity
python verify_dataset.pyv