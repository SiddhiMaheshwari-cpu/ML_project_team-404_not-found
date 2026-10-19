import ast
import os
import time

import requests
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

API_URL = os.getenv("AURA_API_URL", "http://127.0.0.1:8000/api/heal")
LAST_TRIGGER_TIME = {}
COOLDOWN_SECONDS = 5
REQUEST_TIMEOUT = 90          # never wait on the backend forever (it would freeze this watcher too)
MAX_FILE_BYTES = 200_000      # skip huge files such as datasets

# SUPPORTED LANGUAGES
ALLOWED_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", ".go", ".rb", ".php", ".html", ".css", ".json", ".yaml", ".yml")
IGNORED_DIRS = [".venv", "__pycache__", ".git", "node_modules"]

# 🛡️ STRICT IGNORE LIST: AURA will never touch these core/config files
IGNORED_FILES = {
    "main.py", "aura_watcher.py", "check_models.py",
    "index.html", "index.css", "App.css", "App.jsx", "main.jsx",
    "package.json", "package-lock.json", "vite.config.js",
    "eslint.config.js", "tailwind.config.js", "postcss.config.js",
}


class AuraAgent(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory:
            return
        filepath = event.src_path

        if not filepath.endswith(ALLOWED_EXTENSIONS):
            return
        if any(x in filepath for x in IGNORED_DIRS):
            return
        if os.path.basename(filepath) in IGNORED_FILES:
            return

        current_time = time.time()
        if current_time - LAST_TRIGGER_TIME.get(filepath, 0) < COOLDOWN_SECONDS:
            return

        LAST_TRIGGER_TIME[filepath] = current_time
        self.analyze_and_send(filepath)

    def analyze_and_send(self, filepath):
        name = os.path.basename(filepath)
        try:
            if os.path.getsize(filepath) > MAX_FILE_BYTES:
                print(f"⏭️  [AURA WATCHER] {name} is larger than {MAX_FILE_BYTES // 1000} KB. Skipping.")
                return
            with open(filepath, "r", encoding="utf-8") as file:
                code_content = file.read()

            # SMART API SAVER: local AST syntax check for Python
            local_ok = False
            if filepath.endswith(".py"):
                try:
                    ast.parse(code_content)
                    # Syntax is fine and there is no "# aura-fix" marker -> no Gemini call needed
                    local_ok = "# aura-fix" not in code_content.lower()
                except SyntaxError as e:
                    print(f"⚠️ [LOCAL CHECK] Syntax Error at line {e.lineno}. Waking up AI Brain...")

            if local_ok:
                print(f"✅ [LOCAL CHECK] {name} is syntax-error free. Skipping API.")
            else:
                print(f"\n[AURA WATCHER] 👁️ Transmitting {name} to Brain...")

            # local_ok=True still notifies the backend (so the dashboard shows the save) but costs no Gemini call
            response = requests.post(
                API_URL,
                json={"filepath": filepath, "code": code_content, "local_ok": local_ok},
                timeout=REQUEST_TIMEOUT,
            )
            if local_ok:
                return
            if response.status_code != 200:
                print(f"[AURA WATCHER] ⚠️ Backend returned HTTP {response.status_code}")
                return

            result = response.json()
            if result.get("status") != "success":
                print(f"[AURA WATCHER] ⚠️ {name}: {result.get('message')}")
                return

            fixed_code = result.get("patch")
            if fixed_code and result.get("changed"):
                # The user may have kept typing while Gemini was thinking: never overwrite newer edits.
                with open(filepath, "r", encoding="utf-8") as file:
                    if file.read() != code_content:
                        print(f"[AURA WATCHER] ✋ {name} changed while AI was working. Patch discarded.")
                        return
                LAST_TRIGGER_TIME[filepath] = time.time()  # our own write must not re-trigger us
                with open(filepath, "w", encoding="utf-8") as fixed_file:
                    fixed_file.write(fixed_code)
                print(f"[AURA WATCHER] ✨ IN-PLACE FIX APPLIED: {name}")
            else:
                print(f"✅ [AURA WATCHER] No logical changes needed for {name}. Loop prevented.")

        except requests.exceptions.ConnectionError:
            print("[AURA WATCHER] ⚠️ Backend is not reachable. Is `uvicorn main:app --port 8000` running?")
        except requests.exceptions.Timeout:
            print(f"[AURA WATCHER] ⚠️ Backend did not answer within {REQUEST_TIMEOUT}s for {name}.")
        except Exception as e:
            print(f"[AURA WATCHER] ⚠️ System Error: {e}")


def start_watching(path="."):
    event_handler = AuraAgent()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    print("\n[AURA OS] 🟢 Multi-Language Background Agent Running.")
    print("Features: AST API Saver | Strict Anti-Loop | Watching: .py, .js, .jsx, etc.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    start_watching("..")  # Watch parent directory to cover both frontend and backend folders