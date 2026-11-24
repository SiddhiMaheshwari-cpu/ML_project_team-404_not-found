import ast
import os
import sys
import time
import threading
import subprocess
import requests
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

API_URL = os.getenv("AURA_API_URL", "http://127.0.0.1:8000/api/heal")
LAST_HEAL_TIME = {}
DEBOUNCE_TIMERS = {}
IS_HEALING = set()           # Lock so multiple AI calls don't clash on the same file
TYPING_WAIT_SECONDS = 0.8    # Fast side-by-side trigger (0.8s micro-pause)
COOLDOWN_SECONDS = 2.0
REQUEST_TIMEOUT = 90
MAX_FILE_BYTES = 200_000
AUTO_APPLY_FIX = True

ALLOWED_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", ".go", ".rb", ".php", ".html", ".css", ".json", ".yaml", ".yml")
IGNORED_DIRS = [".venv", "__pycache__", ".git", "node_modules", "aura-os"]
IGNORED_FILES = {
    "main.py", "aura_watcher.py", "check_models.py",
    "index.html", "index.css", "App.css", "App.jsx", "main.jsx",
    "package.json", "package-lock.json", "vite.config.js",
    "eslint.config.js", "tailwind.config.js", "postcss.config.js",
}


class AuraAgent(FileSystemEventHandler):
    def _schedule_check(self, filepath):
        if not filepath.endswith(ALLOWED_EXTENSIONS):
            return
        if any(x in filepath for x in IGNORED_DIRS):
            return
        if os.path.basename(filepath) in IGNORED_FILES:
            return

        # Ignore our own recent AI writes
        if time.time() - LAST_HEAL_TIME.get(filepath, 0) < COOLDOWN_SECONDS:
            return

        # If AI is already healing this file in background, don't spam parallel calls
        if filepath in IS_HEALING:
            return

        if filepath in DEBOUNCE_TIMERS:
            DEBOUNCE_TIMERS[filepath].cancel()

        timer = threading.Timer(TYPING_WAIT_SECONDS, self.analyze_and_send, args=[filepath])
        DEBOUNCE_TIMERS[filepath] = timer
        timer.start()

    def on_modified(self, event):
        if not event.is_directory:
            self._schedule_check(event.src_path)

    def on_created(self, event):
        if not event.is_directory:
            self._schedule_check(event.src_path)

    def analyze_and_send(self, filepath):
        name = os.path.basename(filepath)
        IS_HEALING.add(filepath)
        try:
            if not os.path.exists(filepath) or os.path.getsize(filepath) > MAX_FILE_BYTES:
                return
            with open(filepath, "r", encoding="utf-8") as file:
                snapshot_code = file.read()

            if not snapshot_code.strip():
                return
            
            # Prevent infinite loops when AURA saves a healed file
            if "@aura-healed" in snapshot_code or "// @aura-healed" in snapshot_code:
                return

            local_ok = False
            error_log = ""

            # Language-specific syntax checking
            if filepath.endswith(".py"):
                try:
                    ast.parse(snapshot_code)
                    local_ok = "# aura-fix" not in snapshot_code.lower()
                except SyntaxError as e:
                    local_ok = False
                    error_log = f"Line {e.lineno}: {e.msg}"
            elif filepath.endswith((".js", ".ts", ".jsx", ".tsx")):
                # For JS/TS files, we allow them to pass local check so they don't loop, 
                # but if you want Gemini to scan them, you can handle it via backend or set local_ok = False intentionally.
                # To prevent infinite loops on valid JS files, default to True unless a fix is needed:
                
                check = subprocess.run(["node", "--check", filepath], capture_output=True, text=True)
                local_ok = (check.returncode == 0) and ("// aura-fix" not in snapshot_code.lower())
            else:
                local_ok = True

            if local_ok:
                print(f"✅ [LOCAL CHECK] {name} is syntax-error free. Notifying Dashboard (0 Gemini cost)...")
            else:
                print(f"[AURA WATCHER] ⚡ Live-healing {name} in background...")
                if error_log:
                    print(f"[AURA WATCHER] 📝 Error details for {name}: {error_log}")

            # Always notify backend so WebSocket updates the React UI live!
            response = requests.post(
                API_URL,
                json={"filepath": filepath, "code": snapshot_code, "local_ok": local_ok},
                timeout=REQUEST_TIMEOUT,
            )
            if local_ok or response.status_code != 200:
                return
            result = response.json()
            fixed_code = result.get("patch")
            if fixed_code and result.get("changed"):
                if AUTO_APPLY_FIX:
                    # Read latest live file (in case user typed new lines at the bottom while AI worked)
                    with open(filepath, "r", encoding="utf-8") as current_file:
                        live_code = current_file.read()

                    # If user added extra text at the end of the file while AI was thinking, preserve it!
                    if live_code != snapshot_code and live_code.startswith(snapshot_code):
                        newly_typed_suffix = live_code[len(snapshot_code):]
                        final_code = fixed_code.rstrip() + "\n" + newly_typed_suffix.lstrip("\n")
                    else:
                        final_code = fixed_code

                    LAST_HEAL_TIME[filepath] = time.time()
                    with open(filepath, "w", encoding="utf-8") as fixed_file:
                        fixed_file.write(final_code)
                    print(f"[AURA WATCHER] ✨ SIDE-BY-SIDE FIX APPLIED: {name}")

        except Exception as e:
            print(f"[AURA WATCHER] ⚠️ Error: {e}")
        finally:
            IS_HEALING.discard(filepath)


def start_watching(path):
    abs_path = os.path.abspath(path)
    event_handler = AuraAgent()
    observer = Observer()
    observer.schedule(event_handler, abs_path, recursive=True)
    observer.start()
    print("\n[AURA OS] 🟢 Real-Time Side-by-Side Agent Running.")
    print(f"📂 Dynamically Watching Workspace: {abs_path}")
    print(f"⚡ Live Heal Mode: ON (Instant {TYPING_WAIT_SECONDS}s response while typing)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "../.."
    start_watching(target_dir)