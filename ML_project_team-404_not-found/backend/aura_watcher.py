import time
import os
import requests
import ast
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

API_URL = "http://127.0.0.1:8000/api/heal"
LAST_TRIGGER_TIME = {}
COOLDOWN_SECONDS = 5  

# SUPPORTED LANGUAGES
ALLOWED_EXTENSIONS = (".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", ".go", ".rb", ".php", ".html", ".css", ".json", ".yaml", ".yml")

class AuraAgent(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory: return
        filepath = event.src_path
        
        if not filepath.endswith(ALLOWED_EXTENSIONS): return
        if any(x in filepath for x in [".venv", "__pycache__", ".git", "node_modules"]): return
            
        filename = os.path.basename(filepath)
        
        # 🛡️ STRICT IGNORE LIST: AURA will never touch these core/config files
        ignored_files = {
            "main.py", "aura_watcher.py", "check_models.py", 
            "index.html", "index.css", "App.css", "App.jsx", "main.jsx",
            "package.json", "package-lock.json", "vite.config.js", 
            "eslint.config.js", "tailwind.config.js", "postcss.config.js"
        }
        if filename in ignored_files: return
            
        current_time = time.time()
        if current_time - LAST_TRIGGER_TIME.get(filepath, 0) < COOLDOWN_SECONDS: return
            
        LAST_TRIGGER_TIME[filepath] = current_time
        self.analyze_and_send(filepath)
        if event.is_directory: return
        filepath = event.src_path
        
        if not filepath.endswith(ALLOWED_EXTENSIONS): return
        if any(x in filepath for x in [".venv", "__pycache__", ".git", "node_modules"]): return
            
        filename = os.path.basename(filepath)
        if filename in ["main.py", "aura_watcher.py", "check_models.py"]: return
            
        current_time = time.time()
        if current_time - LAST_TRIGGER_TIME.get(filepath, 0) < COOLDOWN_SECONDS: return
            
        LAST_TRIGGER_TIME[filepath] = current_time
        self.analyze_and_send(filepath)

    def analyze_and_send(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                code_content = file.read()
                
            # SMART API SAVER: Local AST Syntax Check for Python
            if filepath.endswith(".py"):
                try:
                    ast.parse(code_content)
                    # Agar syntax perfect hai, aur code mein "bug" ya "aura-fix" nahi likha, toh skip API call
                    if "# aura-fix" not in code_content.lower():
                        print(f"✅ [LOCAL CHECK] {os.path.basename(filepath)} is syntax-error free. Skipping API.")
                        return
                except SyntaxError as e:
                    print(f"⚠️ [LOCAL CHECK] Syntax Error at line {e.lineno}. Waking up AI Brain...")

            print(f"\n[AURA WATCHER] 👁️ Transmitting {os.path.basename(filepath)} to Brain...")
            response = requests.post(API_URL, json={"filepath": filepath, "code": code_content})
            
            if response.status_code == 200:
                fixed_code = response.json().get('patch')
                
                # ✨ NEW STRICT CHECK: Ignores white-spaces and formatting loops ✨
                if fixed_code and "".join(fixed_code.split()) != "".join(code_content.split()):
                    LAST_TRIGGER_TIME[filepath] = time.time()
                    with open(filepath, 'w', encoding='utf-8') as fixed_file:
                        fixed_file.write(fixed_code)
                    print(f"[AURA WATCHER] ✨ IN-PLACE FIX APPLIED: {os.path.basename(filepath)}")
                elif fixed_code:
                    print(f"✅ [AURA WATCHER] No logical changes needed for {os.path.basename(filepath)}. Loop prevented.")
                    
        except Exception as e:
            print(f"[AURA WATCHER] ⚠️ System Error: {e}")

def start_watching(path="."):
    event_handler = AuraAgent()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    print(f"\n[AURA OS] 🟢 Multi-Language Background Agent Running.")
    print("Features: AST API Saver | Strict Anti-Loop | Watching: .py, .js, .jsx, etc.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    start_watching("..") # Watch parent directory to cover both frontend and backend folders