"""AURA-OS backend."""
import sys
import os

# NUCLEAR PATH FIX: Adding every possible parent directory to Python's path
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(THIS_DIR, ".."))
GRANDPARENT_DIR = os.path.abspath(os.path.join(PARENT_DIR, ".."))

sys.path.insert(0, PARENT_DIR)
sys.path.insert(0, GRANDPARENT_DIR)
sys.path.insert(0, os.getcwd())

# Ab ye 100% milega
from ast_parser.pipeline import extract_context_from_error
import ast
import asyncio
import difflib
import re
import time
import uuid
from collections import OrderedDict
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_TIMEOUT = float(os.getenv("GEMINI_TIMEOUT", "60"))  # seconds
MAX_HISTORY = 50
model = genai.GenerativeModel(MODEL_NAME)

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
# For these, indentation IS the code, so an indentation-only fix must count as a change.
INDENT_SENSITIVE = {"Python", "YAML"}


# --- WEBSOCKET MANAGER (for the React UI) -------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.history: "OrderedDict[str, dict]" = OrderedDict()  # last runs, so a page refresh is never empty

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
            self.disconnect(connection)  # drop dead sockets instead of retrying them forever

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
    if _slots is None:  # created lazily so it binds to uvicorn's running loop
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
        # UI/Design files: strict prompt, structure only
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
    # Whole reply must be the word PERFECT. A file that merely *contains* "PERFECT" is not a verdict.
    return re.fullmatch(r"\W*PERFECT\W*", text, re.IGNORECASE) is not None


def same_code(a: str, b: str, lang: str) -> bool:
    if lang in INDENT_SENSITIVE:
        norm = lambda t: "\n".join(line.rstrip() for line in t.strip().splitlines())
        return norm(a) == norm(b)
    return "".join(a.split()) == "".join(b.split())  # whitespace-only reformatting is not a fix


def make_diff(filename: str, before: str, after: str) -> str:
    return "\n".join(difflib.unified_diff(
        before.splitlines(), after.splitlines(), fromfile=f"a/{filename}", tofile=f"b/{filename}", lineterm=""
    ))


# --- API ENDPOINT (for the watcher) -------------------------------------------------------
class CodeData(BaseModel):
    filepath: str
    code: str
    local_ok: bool = False  # watcher's own syntax check passed -> skip Gemini, just tell the UI
    error_log: str = ""     # Added to receive the error log for Member 2's AST parser


async def run_heal(filepath: str, code: str, local_ok: bool = False, error_log: str = "") -> dict:
    filename = os.path.basename(filepath)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    lang = LANGUAGE_MAP.get(ext, "code")
    started = time.time()
    event = {
        "id": uuid.uuid4().hex[:8], "status": "analyzing", "filename": filename, "language": lang,
        "ts": started, "message": f"Analyzing {lang} file", "patch": None, "changed": False,
        "diff": "", "duration": None,
    }

    def finish(**fields):
        event.update(fields, duration=round(time.time() - started, 1))

    print(f"[AURA BRAIN] 🧠 Analyzing {lang} file: {filename}")
    await manager.emit(event)  # the UI sees the run immediately, not only after Gemini answers

    if local_ok:
        finish(status="success", message="Syntax OK (local check, Gemini skipped)", patch=code)
        await manager.emit(event)
        return {"status": "success", "patch": code, "changed": False}

    # Integrate Member 2's AST Logic
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
        # Pass the AST context to the prompt builder
        fixed_code = clean_markdown(await ask_gemini(build_prompt(lang, code, ast_context_text)))

        if is_perfect(fixed_code):
            print(f"✅ [AI CHECK] {filename} ({lang}) is structurally perfect. No patch needed.")
            fixed_code = code
        elif filename.endswith(".py"):
            try:
                ast.parse(fixed_code)  # never hand the watcher a Python file that does not even parse
            except SyntaxError as exc:
                raise ValueError(f"Gemini's fix still has a syntax error (line {exc.lineno}); file left untouched")

        changed = not same_code(code, fixed_code, lang)
        if changed and code.endswith("\n") and not fixed_code.endswith("\n"):
            fixed_code += "\n"
        patch = fixed_code if changed else code

        finish(
            status="success", changed=changed, patch=patch,
            message="Fix ready" if changed else "No issues found",
            diff=make_diff(filename, code, patch) if changed else "",
        )
        await manager.emit(event)
        return {"status": "success", "patch": patch, "changed": changed}

    except asyncio.TimeoutError:
        message = f"Gemini did not answer within {GEMINI_TIMEOUT:.0f}s"
    except Exception as exc:  # quota (429), blocked response, network, bad patch...
        message = str(exc) or exc.__class__.__name__
    
    print(f"[ERROR] {filename}: {message}")
    finish(status="error", message=message)
    await manager.emit(event)
    return {"status": "error", "message": message}


@app.post("/api/heal")
async def heal_code(data: CodeData):
    # Now passing data.error_log to run_heal
    return await run_heal(data.filepath, data.code, data.local_ok, data.error_log)