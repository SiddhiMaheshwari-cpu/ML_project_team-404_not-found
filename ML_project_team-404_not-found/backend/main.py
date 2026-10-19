import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
# Apni API key yahan ensure karo
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Gemini 1.0 Pro use kar rahe hain quota issues se bachne ke liye
model = genai.GenerativeModel('gemini-flash-latest')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET MANAGER (For React UI) ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print("\n[AURA BRAIN] 🟢 React Dashboard UI Connected!")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- API ENDPOINT (For Watcher) ---
class CodeData(BaseModel):
    filepath: str
    code: str

@app.post("/api/heal")
async def heal_code(data: CodeData):
    filename = os.path.basename(data.filepath)
    ext = filename.split('.')[-1]
    
    language_map = {"py": "Python", "js": "JavaScript", "jsx": "React JSX (with Tailwind)", "ts": "TypeScript", "tsx": "TypeScript JSX", "java": "Java", "c": "C", "cpp": "C++", "cs": "C#", "go": "Go", "rb": "Ruby", "php": "PHP", "html": "HTML", "css": "CSS", "json": "JSON", "yaml": "YAML", "yml": "YAML"}
    lang = language_map.get(ext, "code")
    
    print(f"[AURA BRAIN] 🧠 Analyzing {lang} file: {filename}")
    
    try:
        # UI/Design files ke liye strict prompt
        if lang in ["HTML", "CSS"]:
            prompt = f"Review this {lang} code. YOUR ONLY JOB is to fix structural syntax typos (like unclosed tags, missing brackets, or missing semicolons). DO NOT change any design values, colors, classes, or layout logic. If the syntax is structurally valid, strictly reply with 'PERFECT'. Return ONLY raw code:\n\n{data.code}"
        # Logical files (Python, JS, etc.) ke liye purana prompt
        else:
            prompt = f"Review this {lang} code. If there are NO syntax or logical bugs, strictly reply with the word 'PERFECT' and nothing else. If there are bugs, fix them and return ONLY the raw valid {lang} code without explanations:\n\n{data.code}"
        
        response =await  model.generate_content_async(prompt)
        fixed_code = response.text.strip()
        
        # Clean markdown
        if fixed_code.startswith("```"):
            fixed_code = fixed_code.split("\n", 1)[-1]
        if fixed_code.endswith("```"):
            fixed_code = fixed_code.rsplit("\n", 1)[0]
        fixed_code = fixed_code.strip()
        
        if "PERFECT" in fixed_code:
            print(f"✅ [AI CHECK] {filename} ({lang}) is structurally perfect. No patch needed.")
            fixed_code = data.code 
            
        await manager.broadcast({
            "status": "success",
            "filename": filename,
            "patch": fixed_code
        })
        
        return {"status": "success", "patch": fixed_code}
        # Naya strict prompt
        prompt = f"Review this {lang} code. If there are NO syntax or logical bugs, strictly reply with the word 'PERFECT' and nothing else. If there are bugs, fix them and return ONLY the raw valid {lang} code without explanations or markdown blocks:\n\n{data.code}"
        
        response = model.generate_content(prompt)
        fixed_code = response.text.strip()
        
        # Clean markdown
        if fixed_code.startswith("```"):
            fixed_code = fixed_code.split("\n", 1)[-1]
        if fixed_code.endswith("```"):
            fixed_code = fixed_code.rsplit("\n", 1)[0]
        fixed_code = fixed_code.strip()
        
        # Agar AI bole PERFECT, toh same code wapas bhej do taaki loop na bane
        if "PERFECT" in fixed_code:
            print(f"✅ [AI CHECK] {filename} is already perfect. No patch needed.")
            fixed_code = data.code 
        
        await manager.broadcast({
            "status": "success",
            "filename": filename,
            "patch": fixed_code
        })
        
        return {"status": "success", "patch": fixed_code}
        
    except Exception as e:
# ... baaki same rahega
        prompt = f"Fix the following {lang} code. Resolve syntax errors, logical bugs, and maintain best practices. Return ONLY the raw valid {lang} code. Do not include markdown formatting blocks (like ```{lang} or ```). No explanations:\n\n{data.code}"
        
        response = model.generate_content(prompt)
        
        # Clean markdown dynamically
        fixed_code = response.text.strip()
        if fixed_code.startswith("```"):
            fixed_code = fixed_code.split("\n", 1)[-1]
        if fixed_code.endswith("```"):
            fixed_code = fixed_code.rsplit("\n", 1)[0]
        
        await manager.broadcast({
            "status": "success",
            "filename": filename,
            "patch": fixed_code.strip()
        })
        
        return {"status": "success", "patch": fixed_code.strip()}
# ... baaki catch logic same rahega
        
    except Exception as e:
        print(f"[ERROR] {e}")
        await manager.broadcast({
            "status": "error",
            "message": str(e)
        })
        return {"status": "error", "message": str(e)}