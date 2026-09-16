import json
import os
from dotenv import load_dotenv
from agent.graph import agent_app

# Load API keys from .env
load_dotenv()

def test_agent_with_dataset():
    # Week 1 ka data load karo
    with open('member1_dataset.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Testing ke liye sirf pehla instance lete hain
    sample = data[0]
    
    print(f"--- Starting Agent for: {sample['instance_id']} ---")
    
    # Initial state setup karo
    initial_state = {
        "instance_id": sample["instance_id"],
        "error_log": sample["raw_error_log"],
        # Member 2 jab AST tool banayega, tab hum real code context pass karenge.
        # Abhi ke liye hum ek dummy string pass kar rahe hain.
        "code_context": "def dummy_function():\n    pass # Waiting for Member 2's AST tool",
        "generated_patch": None,
        "validation_result": None,
        "retry_count": 0
    }
    
    # Agent ko run karo
    final_state = agent_app.invoke(initial_state)
    
    print("\n=== AGENT OUTPUT (GENERATED PATCH) ===")
    print(final_state["generated_patch"])

if __name__ == "__main__":
    test_agent_with_dataset()