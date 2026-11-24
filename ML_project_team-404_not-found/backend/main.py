"""AURA-OS backend."""
import ast
import asyncio
import difflib
import os
import re
import sys
import time
import uuid
from collections import OrderedDict
from typing import Optional

import google.generativeai as genai
import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# NUCLEAR PATH FIX: Adding every possible parent directory to Python's path
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))
GRANDPARENT_DIR = os.path.abspath(os.path.join(PARENT_DIR, ".."))

sys.path.insert(0, PARENT_DIR)
sys.path.insert(0, GRANDPARENT_DIR)
sys.path.insert(0, os.getcwd())

from ast_parser.pipeline import extract_context_from_error

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "120"))  # seconds
MAX_HISTORY = 50
model = genai.GenerativeModel(MODEL_NAME)

# --- LOAD LIVE ML MODELS ---
CONFIDENCE_MODEL_PATH = os.path.join(THIS_DIR, "models", "aura_confidence_model.pkl")
COMPLEXITY_MODEL_PATH = os.path.join(THIS_DIR, "models", "aura_complexity_model.pkl")

confidence_model = joblib.load(CONFIDENCE_MODEL_PATH) if os.path.exists(CONFIDENCE_MODEL_PATH) else None
complexity_model = joblib.load(COMPLEXITY_MODEL_PATH) if os.path.exists(COMPLEXITY_MODEL_PATH) else None

if confidence_model and complexity_model:
    print("[AURA ML] 🟢 Trained ML Confidence & Complexity models loaded successfully!")
else:
    print("[AURA ML] ⚠️ ML models not found yet. Run 'python ml_model_train.py' to enable live predictions.")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LANGUAGE_MAP = {
    "py": "Python", "js": "JavaScript", "jsx": "React JSX (with Tailwind)", "ts": "TypeScript",
    "tsx": "TypeScript JSX", "java": "Java", "c": "C", "cpp": "C++", "cs": "C#", "go": "Go",
    "rb": "Ruby", "php": "PHP", "html": "HTML", "css": "CSS", "json": "JSON",
    "yaml": "YAML", "yml": "YAML",
}
INDENT_SENSITIVE = {"Python", "YAML"}


def predict_ml_metrics(code: str, error_log: str):
    """Predicts repair confidence (%) and bug complexity using trained ML models."""
    if not confidence_model or not complexity_model:
        return None, None
    try:
        log_text = error_log if error_log else "SyntaxError in source file"
        features = pd.DataFrame([{
            "log_len": len(log_text),
            "file_size": len(code),
            "line_count": code.count("\n") + 1,
        }])
        conf = float(confidence_model.predict(features)[0])
        conf = max(10.0, min(99.5, round(conf, 1)))
        comp = str(complexity_model.predict([log_text])[0])
        return conf, comp
    except Exception as e:
        print(f"[AURA ML] ⚠️ Prediction skipped: {e}")
        return None, None


# --- WEBSOCKET MANAGER (for the React UI) -------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.history: "OrderedDict[str, dict]" = OrderedDict()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("\n[AURA BRAIN] 🟢 React Dashboard UI Connected!")
        await websocket.send_json({"status": "snapshot", "runs": list(self.history.values()), "model": MODEL_NAME})

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def _send(self, connection: WebSocket, data: dict):
        try:
            await connection.send_json(data)
        except Exception:
            self.disconnect(connection)

    async def broadcast(self, data: dict):
        await asyncio.gather(*(self._send(c, data) for c in list(self.active_connections)))

    async def emit(self, event: dict):
        """Remember the event (by run id) and push it to every open dashboard."""
        self.history[event["id"]] = event
        while len(self.history) > MAX_HISTORY:
            self.history.popitem(last=False)
        await self.broadcast(event)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- GEMINI (never blocks the event loop) -------------------------------------------------
_slots: Optional[asyncio.Semaphore] = None


def _get_slots() -> asyncio.Semaphore:
    global _slots
    if _slots is None:
        _slots = asyncio.Semaphore(2)
    return _slots


def _generate(prompt: str) -> str:
    response = model.generate_content(prompt, request_options={"timeout": GEMINI_TIMEOUT})
    return response.text


async def ask_gemini(prompt: str) -> str:
    """The sync SDK call runs in a worker thread; the event loop keeps serving sockets meanwhile."""
    async with _get_slots():
        return await asyncio.wait_for(asyncio.to_thread(_generate, prompt), timeout=GEMINI_TIMEOUT)


def build_prompt(lang: str, code: str, ast_context_text: str = "") -> str:
    if lang in ("HTML", "CSS"):
        return (
            f"Review this {lang} code. YOUR ONLY JOB is to fix structural syntax typos (like unclosed tags, "
            "missing brackets, or missing semicolons). DO NOT change any design values, colors, classes, or "
            "layout logic. If the syntax is structurally valid, strictly reply with 'PERFECT'. "
            f"Return ONLY raw code:\n\n{code}"
        )

    prompt = (
        f"Review this {lang} code. If there are NO syntax or logical bugs, strictly reply with the word "
        f"'PERFECT' and nothing else. If there are bugs, fix them and return ONLY the raw valid {lang} code "
        f"without explanations or markdown blocks:\n\n{code}"
    )

    if ast_context_text:
        prompt += f"\n\n[AST ANALYSIS CONTEXT (Use this to understand deep errors)]\n{ast_context_text}"

    return prompt


def clean_markdown(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("\n", 1)[0]
    return text.strip()


def is_perfect(text: str) -> bool:
    return re.fullmatch(r"\W*PERFECT\W*", text, re.IGNORECASE) is not None


def same_code(a: str, b: str, lang: str) -> bool:
    if lang in INDENT_SENSITIVE:
        norm = lambda t: "\n".join(line.rstrip() for line in t.strip().splitlines())
        return norm(a) == norm(b)
    return "".join(a.split()) == "".join(b.split())


def make_diff(filename: str, before: str, after: str) -> str:
    return "\n".join(difflib.unified_diff(
        before.splitlines(), after.splitlines(), fromfile=f"a/{filename}", tofile=f"b/{filename}", lineterm=""
    ))


# --- API ENDPOINT (for the watcher) -------------------------------------------------------
class CodeData(BaseModel):
    filepath: str
    code: str
    local_ok: bool = False
    error_log: str = ""


async def run_heal(filepath: str, code: str, local_ok: bool = False, error_log: str = "") -> dict:
    filename = os.path.basename(filepath)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    lang = LANGUAGE_MAP.get(ext, "code")
    started = time.time()
    event = {
        "id": uuid.uuid4().hex[:8],
        "status": "analyzing",
        "filename": filename,
        "filepath": filepath,
        "language": lang,
        "ts": started,
        "message": f"Analyzing {lang} file",
        "patch": None,
        "changed": False,
        "diff": "",
        "duration": None,
    }

    def finish(**fields):
        event.update(fields, duration=round(time.time() - started, 1))

    print(f"[AURA BRAIN] 🧠 Analyzing {lang} file: {filename}")
    await manager.emit(event)

    # Run Live ML Prediction
    ml_conf, ml_comp = predict_ml_metrics(code, error_log)
    if ml_conf is not None:
        print(f"[AURA ML] 📊 Predicted Repair Confidence: {ml_conf}% | Complexity: {ml_comp}")
        event["ml_confidence"] = ml_conf
        event["ml_complexity"] = ml_comp

    if local_ok:
        finish(status="success", message="Syntax OK (local check, Gemini skipped)", patch=code)
        await manager.emit(event)
        return {"status": "success", "patch": code, "changed": False}

    # Integrate AST Context
    ast_context_text = ""
    if error_log:
        try:
            ast_info = extract_context_from_error(".", error_log)
            if ast_info:
                print(f"[AURA BRAIN] 🧩 AST Context extracted for {filename}")
                ast_context_text = (
                    f"Error is at Line {ast_info['line_number']} in {ast_info['file_path']}.\n"
                    f"AST Context:\n{ast_info['code_context']}"
                )
        except Exception as e:
            print(f"[AURA BRAIN] ⚠️ Failed to extract AST context: {e}")

    try:
        fixed_code = clean_markdown(await ask_gemini(build_prompt(lang, code, ast_context_text)))

        if is_perfect(fixed_code):
            print(f"✅ [AI CHECK] {filename} ({lang}) is structurally perfect. No patch needed.")
            fixed_code = code
        elif filename.endswith(".py"):
            try:
                ast.parse(fixed_code)
            except SyntaxError as exc:
                raise ValueError(f"Gemini's fix still has a syntax error (line {exc.lineno}); file left untouched")

        changed = not same_code(code, fixed_code, lang)
        if changed and code.endswith("\n") and not fixed_code.endswith("\n"):
            fixed_code += "\n"
        patch = fixed_code if changed else code

        ml_tag = f" [ML Confidence: {ml_conf}% | {ml_comp}]" if ml_conf is not None else ""
        finish(
            status="success",
            changed=changed,
            patch=patch,
            message=("Fix ready for approval" + ml_tag) if changed else "No issues found",
            diff=make_diff(filename, code, patch) if changed else "",
        )
        await manager.emit(event)
        return {"status": "success", "patch": patch, "changed": changed}

    except asyncio.TimeoutError:
        message = f"Gemini did not answer within {GEMINI_TIMEOUT:.0f}s"
    except Exception as exc:
        message = str(exc) or exc.__class__.__name__

    print(f"[ERROR] {filename}: {message}")
    finish(status="error", message=message)
    await manager.emit(event)
    return {"status": "error", "message": message}


@app.post("/api/heal")
async def heal_code(data: CodeData):
    return await run_heal(data.filepath, data.code, data.local_ok, data.error_log)


# --- HUMAN IN THE LOOP: APPROVAL API ---
class PatchApproval(BaseModel):
    file_path: str
    patched_code: str


@app.post("/api/approve-patch")
async def approve_patch(data: PatchApproval):
    try:
        final_code = data.patched_code
        # AI Loop Breaker: Add a tag so the watcher ignores this save
        if "@aura-healed" not in final_code:
            marker = "\n# @aura-healed" if data.file_path.endswith(".py") else "\n// @aura-healed"
            final_code += marker

        with open(data.file_path, "w", encoding="utf-8") as f:
            f.write(final_code)
        return {"status": "success", "message": f"{data.file_path} patched successfully!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}