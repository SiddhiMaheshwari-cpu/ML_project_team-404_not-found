from typing import TypedDict, Optional
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
# ==========================================
# 1. State Definition (Sabse pehle yeh aana chahiye)
# ==========================================
class AgentState(TypedDict):
    instance_id: str
    error_log: str
    code_context: str
    generated_patch: Optional[str]
    validation_result: Optional[str]
    retry_count: int

# ==========================================
# 2. Prompt Template
# ==========================================
patch_generation_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert autonomous AI software engineer.
Your task is to fix a failing test in a Python repository.

You will be provided with:
1. The failing test log (traceback).
2. The code context (AST extracted specific functions/classes).

Analyze the bug and output a strict UNIFIED DIFF PATCH to fix it.
DO NOT output any explanations, markdown blocks, or greetings. Output ONLY the raw unified diff format.

Example of required output format:
--- a/path/to/file.py
+++ b/path/to/file.py
@@ -10,3 +10,3 @@
-    old_broken_code()
+    new_fixed_code()
"""),
    ("user", """
Failing Test Log:
{error_log}

Code Context:
{code_context}
""")
])

# ==========================================
# 3. Node Functions
# ==========================================
def analyze_error_node(state: AgentState):
    print(f"[Node] Analyzing error for instance: {state['instance_id']}")
    return state

def generate_patch_node(state: AgentState):
    print(f"[Node] Generating REAL patch via Gemini... (Attempt: {state['retry_count'] + 1})")
    
    # LLM Initialize kar rahe hain (Gemini 1.5 Flash fast aur efficient hai)
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)  
    # Prompt aur LLM ko connect karke chain banayi
    chain = patch_generation_prompt | llm
    
    # AI ko error log aur code context bhej kar invoke kiya
    response = chain.invoke({
        "error_log": state["error_log"], 
        "code_context": state["code_context"]
    })
    
    actual_patch = response.content

    return {
        "generated_patch": actual_patch,
        "retry_count": state["retry_count"] + 1
    }
    print(f"[Node] Generating mock patch... (Attempt: {state['retry_count'] + 1})")
    
    mock_patch = "--- a/dummy.py\n+++ b/dummy.py\n@@ -1,2 +1,2 @@\n- bug\n+ fix"

    return {
        "generated_patch": mock_patch,
        "retry_count": state["retry_count"] + 1
    }

# ==========================================
# 4. Graph Construction (Sabse last mein aana chahiye)
# ==========================================
workflow = StateGraph(AgentState)

workflow.add_node("analyze_error", analyze_error_node)
workflow.add_node("generate_patch", generate_patch_node)

workflow.add_edge(START, "analyze_error")
workflow.add_edge("analyze_error", "generate_patch")
workflow.add_edge("generate_patch", END)

# Graph compile karke export kar rahe hain
agent_app = workflow.compile()