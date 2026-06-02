from dotenv import load_dotenv
import os
from fastapi import FastAPI

if (os.path.exists('.env')):
    load_dotenv('.env')


class Config:
    PORT = int(os.environ.get("PORT", "3000"))
    LOG_FILE_NAME = os.environ.get("LOG_FILE_NAME") or "logs.txt"
    API_KEY = os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY")
    MODEL_PROVIDER = os.environ.get("MODEL_PROVIDER", "gemini").strip().lower()
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
    GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()

bot = FastAPI()
