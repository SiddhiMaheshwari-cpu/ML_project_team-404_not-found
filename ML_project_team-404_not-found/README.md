# ⚡ AURA-OS: Autonomous AI-Driven Self-Healing Pipeline

AURA (Autonomous Real-time AI) is an intelligent, background-running CI/CD monitor that actively watches the filesystem for syntax and logical anomalies. Upon detecting a failure, AURA intercepts the code, analyzes the Abstract Syntax Tree (AST), queries a highly optimized Gemini Flash pipeline, and performs an in-place automated hot-fix without manual intervention.

## 🚀 System Architecture

*   **The Agent (Python Watchdog):** Background daemon utilizing event-driven architecture to monitor `.py`, `.js`, and `.jsx` modifications, featuring a debounce-lock mechanism to prevent infinite regression loops.
*   **The Brain (FastAPI Backend):** High-throughput Python server managing API quotas via local AST pre-checking. Communicates with Google's Generative AI to synthesize code patches.
*   **The Dashboard (React + WebSockets):** Real-time monitoring UI delivering instant visualization of AI intercepts, patching workflows, and live diffs.

## ✨ Core Capabilities

*   **Zero-Click Auto-Healing:** Fixes runtime errors, mutable default traps, zero-divisions, and race conditions the moment a file is saved.
*   **Smart API Saver:** Utilizes Python's `ast` module to validate code locally, reserving API limits exclusively for deep logical corrections.
*   **Multi-Language Support:** Natively supports Python engines and full-stack React/Tailwind frontend components.
*   **Anti-Loop Protection:** Strict caching and timestamp-based debounce locks ensure the AI doesn't trigger on its own automated saves.

## 🛠️ Tech Stack
**Backend:** Python 3, FastAPI, Uvicorn, Google Gemini API, Watchdog  
**Frontend:** React, Vite, Tailwind CSS, WebSockets  

## ⚙️ Quick Start

1. **Spin up the Core Brain (Backend)**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/scripts/activate  # Windows
   pip install -r requirements.txt
   uvicorn main:app --host 127.0.0.1 --port 8000