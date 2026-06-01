import os
import uvicorn
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

try:
    from app import bot, Config
    from app.plugins.fetch import API
    from app.plugins.ocr import OCR
    from app.plugins.chunk import Chunker
    from app.plugins.embed import Embed
    from app.plugins.llm import LLM
    from app.plugins.cosine import cosine_similarity
except ImportError:
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app import bot, Config
    from app.plugins.fetch import API
    from app.plugins.ocr import OCR
    from app.plugins.chunk import Chunker
    from app.plugins.embed import Embed
    from app.plugins.llm import LLM
    from app.plugins.cosine import cosine_similarity

CURRENT_API_KEY = Config.API_KEY or ""

api_fetcher = API()
pdf_ocr = OCR()
chunker = Chunker()
embedder = Embed()

class QueryRequest(BaseModel):
    query: str
    num_files: int = 10
    chunk_size: int = 400
    overlap: int = 100

class SettingsRequest(BaseModel):
    api_key: str

@bot.get("/api/settings")
async def get_settings():
    masked_key = ""
    if CURRENT_API_KEY:
        if len(CURRENT_API_KEY) > 10:
            masked_key = CURRENT_API_KEY[:6] + "..." + CURRENT_API_KEY[-4:]
        else:
            masked_key = "..."
    return {
        "api_key": masked_key,
        "raw_api_key_configured": bool(CURRENT_API_KEY)
    }

@bot.post("/api/settings")
async def update_settings(req: SettingsRequest):
    global CURRENT_API_KEY
    if req.api_key:
        CURRENT_API_KEY = req.api_key.strip()
        env_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
        try:
            lines = []
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    lines = f.readlines()
            
            new_lines = []
            replaced = False
            for line in lines:
                if line.strip().startswith("API_KEY="):
                    new_lines.append(f'API_KEY="{CURRENT_API_KEY}"\n')
                    replaced = True
                else:
                    new_lines.append(line)
            if not replaced:
                new_lines.append(f'API_KEY="{CURRENT_API_KEY}"\n')
            
            with open(env_path, "w") as f:
                f.writelines(new_lines)
        except Exception as e:
            print(f"[WARNING] Could not persist API key to .env: {e}")
            
    return {"status": "success", "message": "API Key updated successfully"}

@bot.post("/api/query")
async def handle_query(req: QueryRequest):
    global CURRENT_API_KEY
    if not CURRENT_API_KEY:
        raise HTTPException(
            status_code=400, 
            detail="Gemini API Key is not configured. Please add your key in Settings."
        )

    llm = LLM(api_key=CURRENT_API_KEY)

    try:
        print(f"[RAG] Step 1: Reformulating query: '{req.query}'")
        search_keyword, semantic_query = llm.reformulate(req.query)
        print(f"[RAG] Keywords: search='{search_keyword}', semantic='{semantic_query}'")

        print(f"[RAG] Step 2: Fetching matching records from justice.gov")
        links = await api_fetcher.fetch(search_keyword, num=req.num_files)
        if not links:
            return {
                "answer": "No relevant documents found on justice.gov for this query.",
                "reformulated": {"search": search_keyword, "semantic": semantic_query},
                "sources": []
            }

        print(f"[RAG] Step 3: Downloading documents")
        downloaded_files = await api_fetcher.download(links, verbose=True)
        
        print(f"[RAG] Step 4: Scanning and extracting text layers")
        text_files = await pdf_ocr.extract(downloaded_files)
        
        print(f"[RAG] Step 5: Creating overlapping chunk sets")
        flat_chunks = await chunker.create_chunks(text_files)
        
        if not flat_chunks:
            return {
                "answer": "Documents were found, but no text could be extracted or chunked.",
                "reformulated": {"search": search_keyword, "semantic": semantic_query},
                "sources": []
            }

        print(f"[RAG] Step 6: Generating document embeddings")
        embedded_chunks = embedder.embed_list(flat_chunks)
        q_vector = embedder.embed_query(semantic_query)
        
        print(f"[RAG] Step 7: Aligning semantic similarity")
        top_chunks = cosine_similarity(q_vector, embedded_chunks)
        
        url_lookup = {link["NAME"]: link["URL"] for link in downloaded_files}

        sources_out = []
        for tc in top_chunks:
            sources_out.append({
                "chunk": tc["chunk"],
                "source": tc["source"],
                "score": round(tc["score"] * 100, 1),
                "url": url_lookup.get(tc["source"], "")
            })

        print(f"[RAG] Step 8: Synthesizing final response")
        final_answer = llm.answer(req.query, top_chunks)

        return {
            "answer": final_answer,
            "reformulated": {
                "search": search_keyword,
                "semantic": semantic_query
            },
            "sources": sources_out
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

DIST_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
ASSETS_PATH = os.path.join(DIST_PATH, "assets")

if os.path.exists(ASSETS_PATH):
    bot.mount("/assets", StaticFiles(directory=ASSETS_PATH), name="assets")

@bot.get("/", response_class=HTMLResponse)
async def get_index():
    index_html = os.path.join(DIST_PATH, "index.html")
    if os.path.exists(index_html):
        with open(index_html, "r") as f:
            return f.read()
    return """<html><body>React Frontend build folder not found. Please run 'npm run build' inside frontend directory.</body></html>"""

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"Starting uvicorn server on port {port}...")
    uvicorn.run("app.__main__:bot", host="0.0.0.0", port=port, reload=True)
