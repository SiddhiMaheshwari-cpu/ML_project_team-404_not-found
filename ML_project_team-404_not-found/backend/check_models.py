import os
import google.generativeai as genai
from dotenv import load_dotenv

# .env se API key load karna
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Fetching available models for your API key...\n")

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(m.name)
except Exception as e:
    print(f"Error checking models: {e}")