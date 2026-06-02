import os
import uvicorn
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
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
    from app.plugins.web import WebIngestor
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
    from app.plugins.web import WebIngestor

CURRENT_API_KEY = Config.API_KEY or ""

api_fetcher = API()
pdf_ocr = OCR()
chunker = Chunker()
embedder = Embed()
web_ingestor = WebIngestor()

def is_internet_chunk(chunk):
    return chunk.get("type") == "internet" or bool(chunk.get("url"))

def chunk_identity(chunk):
    return (
        chunk.get("source", ""),
        chunk.get("part", ""),
        chunk.get("url", ""),
        chunk.get("chunk", "")[:120],
    )

def include_internet_sources(top_chunks, internet_chunks, minimum=5):
    selected = list(top_chunks)
    seen = {chunk_identity(chunk) for chunk in selected}
    internet_count = sum(1 for chunk in selected if is_internet_chunk(chunk))

    for chunk in internet_chunks:
        if internet_count >= minimum:
            break
        key = chunk_identity(chunk)
        if key in seen:
            continue
        selected.append(chunk)
        seen.add(key)
        internet_count += 1

    return selected

@bot.on_event("startup")
async def startup_event():
    print("[STARTUP] Refreshing API downloads cache...")
    await api_fetcher.refresh()
    print("[STARTUP] API downloads cache refreshed successfully.")

class QueryRequest(BaseModel):
    query: str
    num_files: int = 30
    chunk_size: int = 4000
    overlap: int = 500
    doc_chunks: int = 15
    web_chunks: int = 3

from typing import Optional

class SettingsRequest(BaseModel):
    api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    provider: Optional[str] = None
    groq_model: Optional[str] = None

@bot.get("/api/settings")
async def get_settings():
    masked_key = ""
    if CURRENT_API_KEY:
        if len(CURRENT_API_KEY) > 10:
            masked_key = CURRENT_API_KEY[:6] + "..." + CURRENT_API_KEY[-4:]
        else:
            masked_key = "..."
            
    groq_api_key = os.environ.get("GROQ_API_KEY", "").strip()
    masked_groq_key = ""
    if groq_api_key:
        if len(groq_api_key) > 10:
            masked_groq_key = groq_api_key[:6] + "..." + groq_api_key[-4:]
        else:
            masked_groq_key = "..."
            
    return {
        "api_key": masked_key,
        "raw_api_key_configured": bool(CURRENT_API_KEY),
        "groq_api_key": masked_groq_key,
        "raw_groq_key_configured": bool(groq_api_key),
        "provider": os.environ.get("MODEL_PROVIDER", "gemini").strip().lower(),
        "groq_model": os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
    }

@bot.post("/api/settings")
async def update_settings(req: SettingsRequest):
    global CURRENT_API_KEY

    env_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
    try:
        # Always read current .env from disk — NEVER from os.environ to avoid stale values
        env_dict = {}
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f.readlines():
                    if "=" in line and not line.strip().startswith("#"):
                        k, _, v = line.partition("=")
                        env_dict[k.strip()] = v.strip().strip('"').strip("'")

        # Only overwrite keys that were explicitly provided in the request
        if req.api_key is not None and req.api_key.strip() != "":
            env_dict["API_KEY"] = req.api_key.strip()
            CURRENT_API_KEY = req.api_key.strip()

        if req.groq_api_key is not None and req.groq_api_key.strip() != "":
            env_dict["GROQ_API_KEY"] = req.groq_api_key.strip()

        if req.provider is not None:
            env_dict["MODEL_PROVIDER"] = req.provider.strip().lower()

        if req.groq_model is not None and req.groq_model.strip() != "":
            env_dict["GROQ_MODEL"] = req.groq_model.strip()

        # Write back to .env
        with open(env_path, "w") as f:
            for k, v in env_dict.items():
                f.write(f'{k}="{v}"\n')

        # Sync os.environ with ONLY what's now on disk
        os.environ["API_KEY"] = env_dict.get("API_KEY", "")
        os.environ["GROQ_API_KEY"] = env_dict.get("GROQ_API_KEY", "")
        os.environ["MODEL_PROVIDER"] = env_dict.get("MODEL_PROVIDER", "gemini")
        os.environ["GROQ_MODEL"] = env_dict.get("GROQ_MODEL", "openai/gpt-oss-120b")
        CURRENT_API_KEY = env_dict.get("API_KEY", "")

    except Exception as e:
        print(f"[WARNING] Could not persist API settings to .env: {e}")

    return {"status": "success", "message": "Settings updated successfully"}

@bot.post("/api/query")
async def handle_query(req: QueryRequest):
    llm = LLM()

    try:
        print(f"[RAG] Step 1: Reformulating query: '{req.query}'")
        search_keyword, semantic_query = llm.reformulate(req.query)
        web_query = llm.get_web_search_query(req.query)
        print(f"[RAG] Keywords: search='{search_keyword}', semantic='{semantic_query}', web='{web_query}'")

        print(f"[RAG] Step 2: Fetching matching records from justice.gov")
        links = await api_fetcher.fetch(search_keyword, num=req.num_files)

        print(f"[RAG] Step 3: Downloading documents")
        downloaded_files = await api_fetcher.download(links, verbose=True) if links else []
        
        print(f"[RAG] Step 4: Scanning and extracting text layers")
        text_files = await pdf_ocr.extract(downloaded_files) if downloaded_files else []
        
        print(f"[RAG] Step 5: Creating overlapping chunk sets")
        flat_chunks = await chunker.create_chunks(text_files) if text_files else []

        print(f"[RAG] Step 5.5: Ingesting internet sources")
        web_chunks = await web_ingestor.ingest(
            web_query,
            max_results=6,
            chunk_size=req.chunk_size,
            overlap=req.overlap
        )
        flat_chunks.extend(web_chunks)
        
        if not flat_chunks:
            return {
                "answer": "No document text or internet context could be extracted for this query.",
                "reformulated": {"search": search_keyword, "semantic": semantic_query, "web": web_query},
                "sources": []
            }

        print(f"[RAG] Step 6: Generating document embeddings")
        doc_chunks = [c for c in flat_chunks if not is_internet_chunk(c)]
        net_chunks = [c for c in flat_chunks if is_internet_chunk(c)]

        q_vector = embedder.embed_query(semantic_query)

        print(f"[RAG] Step 7: Aligning semantic similarity (docs={len(doc_chunks)}, web={len(net_chunks)})")
        top_doc_chunks = cosine_similarity(q_vector, embedder.embed_list(doc_chunks), top_n=req.doc_chunks) if doc_chunks else []
        top_web_chunks = cosine_similarity(q_vector, embedder.embed_list(net_chunks), top_n=req.web_chunks) if net_chunks else []

        top_chunks = top_doc_chunks + top_web_chunks

        url_lookup = {link["NAME"]: link["URL"] for link in downloaded_files}

        sources_out = []
        for tc in top_chunks:
            is_internet = is_internet_chunk(tc)
            source_name = tc.get("url") if is_internet and tc.get("url") else tc["source"]
            sources_out.append({
                "chunk": tc["chunk"],
                "source": source_name,
                "source_id": tc["source"],
                "title": tc.get("title", ""),
                "type": "internet" if is_internet else "document",
                "citation": tc.get("citation", tc.get("source", "")),
                "score": round(tc["score"] * 100, 1),
                "url": tc.get("url") or url_lookup.get(tc["source"], "")
            })

        print(f"[RAG] Step 8: Synthesizing final response")
        final_answer = llm.answer(req.query, top_chunks)

        return {
            "answer": final_answer,
            "reformulated": {
                "search": search_keyword,
                "semantic": semantic_query,
                "web": web_query
            },
            "sources": sources_out
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        active_provider = getattr(llm, "active_provider", "gemini")
        
        is_permission_error = ("PERMISSION_DENIED" in error_msg or 
                               "denied access" in error_msg or 
                               "unauthorized" in error_msg.lower() or 
                               "forbidden" in error_msg.lower() or 
                               "403" in error_msg)
                               
        if is_permission_error:
            if active_provider == "gemini":
                raise HTTPException(
                    status_code=400,
                    detail="The configured Gemini API Key has been denied access by Google AI Studio (403 Permission Denied). Please open the Start Menu (bottom-left) and enter a valid Gemini API Key."
                )
            elif active_provider == "groq":
                raise HTTPException(
                    status_code=400,
                    detail=f"The configured Groq API Key has been denied access or is unauthorized (403 Permission Denied/Forbidden). Please open the Start Menu (bottom-left) and verify your Groq API Key and billing status. Error details: {error_msg}"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Access denied or permission error from active provider '{active_provider}'. Details: {error_msg}"
                )
        raise HTTPException(status_code=500, detail=f"Pipeline error ({active_provider}): {error_msg}")
    finally:
        print("[RAG] Cleaning downloads cache via api_fetcher.refresh()...")
        await api_fetcher.refresh()

DIST_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
ASSETS_PATH = os.path.join(DIST_PATH, "assets")
WALLPAPERS_PATH = os.path.join(DIST_PATH, "wallpapers")

if os.path.exists(ASSETS_PATH):
    bot.mount("/assets", StaticFiles(directory=ASSETS_PATH), name="assets")

if os.path.exists(WALLPAPERS_PATH):
    bot.mount("/wallpapers", StaticFiles(directory=WALLPAPERS_PATH), name="wallpapers")

@bot.get("/favicon.svg")
async def get_favicon():
    fav = os.path.join(DIST_PATH, "favicon.svg")
    if os.path.exists(fav):
        return FileResponse(fav)
    raise HTTPException(status_code=404, detail="favicon.svg not found")

@bot.get("/icons.svg")
async def get_icons():
    ic = os.path.join(DIST_PATH, "icons.svg")
    if os.path.exists(ic):
        return FileResponse(ic)
    raise HTTPException(status_code=404, detail="icons.svg not found")

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
