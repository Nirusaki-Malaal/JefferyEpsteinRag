# Jeffrey Epstein RAG Explorer — Architecture & Folder Structure Documentation

This document provides a comprehensive overview of the **Jeffrey Epstein Federal Records RAG (Retrieval-Augmented Generation) Explorer** project. It explains the project's layout, directory structure, and the responsibility of every single file within the system.

---

## 📂 Directory Tree

Below is the directory structure of the project:

```text
Formalization/
├── .env                  # Environment configurations (API keys, ports, models)
├── .gitignore            # Git exclusion rules
├── requirements.txt      # Python package dependencies
├── documentation.md      # This architectural explanation file
├── README.md             # Layman guide to install and run the app
│
├── artifacts/            # UI screenshots and application guides
│   ├── chatapp1_artifact.png
│   ├── chatapp2_artifact.png
│   ├── desktop1_artifact.png
│   ├── desktop2_artifact.png
│   ├── document_artifact.png
│   └── menu_artifact.png
│
├── downloads/            # Dynamic cache folder for justice.gov PDFs (auto-cleaned)
├── ocr_text/             # Cached OCR'd text files corresponding to downloads
│
├── app/                  # Python FastAPI Backend
│   ├── __init__.py       # Initializes FastAPI app & loads .env Config variables
│   ├── __main__.py       # Server routes, static asset delivery, and RAG execution pipeline
│   ├── index.html        # Legacy dashboard with live animated pipeline stages
│   └── plugins/          # Core RAG engine modules
│       ├── chunk.py      # Overlapping text chunker to preserve context boundaries
│       ├── cosine.py     # Cosine similarity matrix operations for ranking chunks
│       ├── embed.py      # Local vector embeddings generator using FastEmbed
│       ├── fetch.py      # Asynchronous PDF searcher and downloader for justice.gov
│       ├── llm.py        # Connectors for Gemini, Groq, and Ollama; prompt templates
│       ├── ocr.py        # PDF digital text extractor with pytesseract fallback
│       └── web.py        # Live DuckDuckGo internet scraper and crawler
│
└── frontend/             # React + Vite Premium Aero Glass Frontend
    ├── package.json      # React dependencies & scripts
    ├── tsconfig.json     # TypeScript configuration
    ├── vite.config.ts    # Vite bundler rules
    ├── index.html        # Main HTML wrapper for React mounting
    │
    └── src/              # React Source files
        ├── main.tsx      # Application entrypoint
        ├── index.css     # Premium Windows 7 Aero glassmorphism stylesheet
        ├── App.tsx       # State manager, settings API sync, and core layout coordinator
        │
        ├── assets/       # Static image and SVG resources
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        │
        └── components/   # Modular React components matching Windows 7 widgets
            ├── AeroWindow.tsx    # Drag-capable glass window with min/max/close controls
            ├── Desktop.tsx       # Grid system for desktop shortcut icons with hover animations
            ├── Taskbar.tsx       # Bottom taskbar with glowing Start Button and System Tray
            ├── StartMenu.tsx     # Start Menu containing model selector & configuration sliders
            ├── ClockGadget.tsx    # Classic round desktop clock gadget showing live time
            ├── CopyDialog.tsx     # Copy animation overlay representing RAG pipeline stages
            ├── ChatArea.tsx       # Interactive chat panel with query entry and citation links
            ├── SourceSidebar.tsx  # Document analysis panel with searching, sorting, and stats
            └── SourcePopup.tsx    # Quick popup to read a document chunk from inline citations
```

---

## 🐍 Backend Modules (`app/`)

### 1. `app/__init__.py`
* **Purpose**: Initializes the Python application.
* **Function**: 
  * Checks for a `.env` file on disk and loads it using `python-dotenv`.
  * Exposes a `Config` class holding critical environment variables:
    * `PORT`: Server port (default: 3000).
    * `API_KEY` / `GEMINI_API_KEY`: Primary API key for Gemini models.
    * `MODEL_PROVIDER`: Default LLM engine ('gemini', 'groq', or 'ollama').
    * `GROQ_API_KEY`: Cloud API key for Groq queries.
    * `GROQ_MODEL`: Model ID to request via Groq (e.g., `openai/gpt-oss-120b`).
  * Declares the global `bot = FastAPI()` instance.

### 2. `app/__main__.py`
* **Purpose**: Application controller and HTTP gateway.
* **Function**:
  * Hosts `/api/settings` (GET/POST) to dynamically display masked API keys, change model settings, and persist configurations directly to `.env` on disk.
  * Hosts `/api/query` (POST) which receives user prompts, runs the entire RAG pipeline, and responds with a JSON payload of citations and text points.
  * Static file mount points: serves assets, icons, wallpapers, and maps the root `/` to serve the React built folder (`frontend/dist`).
  * Bootstraps Uvicorn to run the local server on `0.0.0.0:[PORT]`.

---

## ⚙️ RAG Engine Plugins (`app/plugins/`)

### 3. `app/plugins/chunk.py` (Chunker)
* **Purpose**: Text segmenter.
* **Function**:
  * Implements `overlap_chunker()` which takes raw document text and creates overlapping segments of size `chunk_size` with a set `overlap` step to prevent losing details at the boundaries.
  * `create_chunks()` loops over downloaded text files in parallel, reading contents and flat-mapping them into a global chunk collection.

### 4. `app/plugins/cosine.py` (Cosine Similarity)
* **Purpose**: Semantic comparison engine.
* **Function**:
  * Implements `cosine_similarity()` which performs matrix multiplication (`@`) between a query vector and all chunk vectors, normalizing them with linear algebra norms to output ranked similarity percentages.
  * Restricts results to the top `N` highest-scoring chunks, attaching a similarity score percentage to each.

### 5. `app/plugins/embed.py` (Embeddings Generator)
* **Purpose**: Local text vectorizer.
* **Function**:
  * Uses the highly efficient, lightweight `fastembed` library to instantiate the `BAAI/bge-small-en-v1.5` transformer model locally.
  * Generates 384-dimensional dense vectors representing the exact semantic meaning of both text chunks and user queries without invoking external API calls.

### 6. `app/plugins/fetch.py` (Justice Gov Downloader)
* **Purpose**: Federal document retrieval.
* **Function**:
  * Integrates with `https://www.justice.gov/multimedia-search` API to fetch relevant Epstein-related federal documents.
  * Implements asynchronous page fetching and PDF downloading via `httpx` under strict rate-limit protection (`asyncio.Semaphore`).
  * `refresh()` cleans up the local download cache folders to maintain a clean workspace.

### 7. `app/plugins/llm.py` (LLM Orchestrator)
* **Purpose**: Model connection and prompting.
* **Function**:
  * Resolves which LLM provider (Gemini, Groq, or Ollama) is configured and boots the corresponding client libraries.
  * Holds custom system prompt templates:
    * `SEARCH_PROMPT`: Converts conversational questions into single keywords suited for search indexes.
    * `SEMANTIC_PROMPT`: Creates detailed evidence-seeking paragraphs for vector searching.
    * `WEB_SEARCH_PROMPT`: Formulates high-recall DuckDuckGo web search inputs.
    * `ANSWER_PROMPT`: Instructs the LLM to output valid structured JSON containing lists of points, sources, relevance analyses, and conclusions.
  * Automatically checks and normalizes all source URLs so that internet claims are backed by actual internet citation links.

### 8. `app/plugins/ocr.py` (OCR & Extraction Engine)
* **Purpose**: PDF-to-Text conversion.
* **Function**:
  * Implements a smart text extraction model.
  * First attempts to extract clean digital text directly from the PDF pages using `pypdfium2`.
  * If the digital text layer is empty (which is true for scanned court documents, fax sheets, or handwritten records), it triggers an OCR process using `pdf2image` and local `pytesseract` engines to generate high-quality text files.

### 9. `app/plugins/web.py` (Web Search Crawler)
* **Purpose**: Internet context enrichment.
* **Function**:
  * Utilizes `duckduckgo_search` (`DDGS`) to perform real-time internet searches based on optimized query phrases.
  * Filters out search engines (Google, Yahoo, Bing, DDG) to ensure only genuine news, lawsuits, and investigative articles are evaluated.
  * Downloads crawled HTML pages concurrently, strips CSS/script tags using `HTMLParser`, and breaks web text into clean web search chunks with exact citations.

---

## 🎨 React Aero Frontend (`frontend/src/`)

### 10. `frontend/src/App.tsx`
* **Purpose**: Main coordinator of the user experience.
* **Function**:
  * Manages global states (messages, active sources, settings values, dragging windows, load states, start menu).
  * Executes query request POSTs to the server, triggers visual progress bar steps, and updates the chat area with responses.

### 11. `frontend/src/index.css`
* **Purpose**: Style core.
* **Function**:
  * Implements custom styles including transparency, glass text shadows, taskbars, start menus, custom range inputs, glossy icons, scrollbars, and system gadgets.

### 12. `frontend/src/components/AeroWindow.tsx`
* **Purpose**: Aero Frame.
* **Function**:
  * Renders a classic glassy window complete with minimize, maximize, and close controls. Includes pointer events to allow smooth window dragging across the desktop screen.

### 13. `frontend/src/components/Desktop.tsx`
* **Purpose**: Desktop background and shortcuts.
* **Function**:
  * Renders classic shortcut icons ("Jeffrey Epstein Dossier", "Justice Dept Portal", "Recycling Bin") with glow hover borders.

### 14. `frontend/src/components/ClockGadget.tsx`
* **Purpose**: Live Gadget.
* **Function**:
  * Implements a beautiful, classic round sidebar clock showing the actual system time.

### 15. `frontend/src/components/Taskbar.tsx`
* **Purpose**: Navigation bar.
* **Function**:
  * Shows the glowing orb Start Menu button, shortcuts to active windows, and the system clock in the tray.

### 16. `frontend/src/components/StartMenu.tsx`
* **Purpose**: Core configuration panel.
* **Function**:
  * Renders the Start Menu listing system links and houses the RAG settings sliders (document count, web chunks, chunk size, overlap) and API key inputs.

### 17. `frontend/src/components/CopyDialog.tsx`
* **Purpose**: Pipeline visualizer.
* **Function**:
  * Shows a classic Windows file-copy dialog layout showing an animated progress bar and detailed pipeline messages during RAG queries.

### 18. `frontend/src/components/ChatArea.tsx`
* **Purpose**: Conversation interface.
* **Function**:
  * Standard chat bubble thread rendering user questions and the bot's JSON answers. Auto-scrolls to the newest message.

### 19. `frontend/src/components/SourceSidebar.tsx`
* **Purpose**: Scientific evidence panel.
* **Function**:
  * Lists and ranks all sources (documents & internet URLs) retrieved during the search.
  * Allows filtering, searching, and displays a complete text preview of selected chunks with quick copy-to-clipboard options.

### 20. `frontend/src/components/SourcePopup.tsx`
* **Purpose**: Citation inspector.
* **Function**:
  * Standard pop-up window opened instantly by clicking on a source PDF or internet link citation in the chat response, making it easy to cross-verify answers on the fly.
