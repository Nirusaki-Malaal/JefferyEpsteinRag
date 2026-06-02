import os
import json
import re
import requests

try:
    from google import genai
except ImportError:
    genai = None

SEARCH_PROMPT = """You are a search query optimizer for a legal document search engine focused on Epstein-related federal court documents. The search engine is highly sensitive and works best with a single keyword: the first name of the person, company, place, or topic being searched in connection with Epstein. Do not return "Epstein" because the entire database is already Epstein-related.

Rules:
* Return one word only: the strongest searchable keyword
* Prefer the subject's first name for people
* If there are multiple subjects, choose the most specific non-Epstein subject
* No punctuation, no quotes, no explanation
* The input will always be a question about a person's connection to Epstein court documents
Example:
* Input: "narendra modi links with jeffrey epstein"
* Output: Narendra
* Input: "what was manmohan singh links with jeffrey epstein ?"
* Output: Manmohan"""

SEMANTIC_PROMPT = """You are a semantic search query optimizer for an AI-powered RAG bot that answers questions about the Jeffrey Epstein federal court documents. Your rephrased query will be embedded and used to find the most semantically similar chunks from OCR'd legal documents, FBI files, court filings, flight logs, witness testimony, exhibits, investigation reports, and internet sources.
Your job is to turn the user's question into a dense evidence-seeking paragraph that maximizes recall.

Rules:
- Preserve the original subject names and include likely aliases, roles, and close variants
- Include related legal and investigative terms such as contacts, meetings, flights, correspondence, testimony, exhibits, allegations, records, referrals, and denials when relevant
- Include both direct evidence and near-match language that OCR text might contain
- Use formal legal language matching court and investigation records
- No bullet points, no explanation, just the rephrased query"""

WEB_SEARCH_PROMPT = """You are preparing a web search query for a RAG pipeline that needs reputable internet sources about a user's Epstein-related question.

Rules:
- Return one concise search query only
- Keep the person's or entity's full name intact
- Include Jeffrey Epstein or Epstein records unless already present
- Prefer source-seeking terms such as documents, records, flight logs, lawsuit, court filing, news, statement, denial, or evidence when useful
- Do not return generic search engine URLs or instructions
- No markdown, no bullets, no explanation"""


ANSWER_PROMPT = """You are an AI assistant answering questions about the Jeffrey Epstein federal court documents.
You will be given exactly up to 15 document chunks (from OCR'd PDFs) and up to 3 internet web search chunks. Document chunks are the primary source of truth — prioritize them over internet sources.
Cite the source filename or internet URL for every factual claim.
Use both document chunks and internet chunks when they are present and relevant.
If an internet chunk supports a claim, the claim MUST cite the exact full URL shown in that chunk's Citation or Internet URL field.
Never cite internet evidence as WEB_1.url, WEB_2.url, or any other placeholder when a full URL is available.
Give the maximum useful answer supported by the provided context: include direct matches, indirect matches, near misses, contradictions, denials, source limitations, and what each source actually says.
Explain each and every provided file or internet source separately in source_analysis, even when a source only has a weak match or no direct match.
If the documents do not contain enough information, use the provided internet chunks to answer the closest relevant question and clearly identify the internet URL sources.
If the provided links or chunks are insufficient or slightly off-topic, YOU MUST use your own internal knowledge to provide the correct answer.

You MUST format your response strictly as a valid JSON object with the following structure:
{
  "points": [
    {
      "text": "Factual claim or statement citing the document name or source / internet source.",
      "sources": ["source_filename.pdf or full URL"]
    }
  ],
  "source_analysis": [
    {
      "source": "source_filename.pdf or full URL",
      "type": "document or internet",
      "relevance": "How this source relates to the user's question.",
      "key_findings": ["Point-by-point notes on what this source says, including no-match notes when relevant."]
    }
  ],
  "conclusion": [
    "Summary or concluding bullet point."
  ]
}

Rules for JSON:
- Do NOT include any markdown code fence blocks (like ```json or ```) or plain text explanations outside of the JSON object.
- Strictly return only a valid JSON string. No trailing commas. No comments.
- Each point must include at least one citation in its "sources" array.
- Include a source_analysis item for EVERY provided source filename or URL in the context — all 10 document chunks and all 5 internet chunks.
- In source_analysis, explain each file or URL point by point. If a source has no direct evidence, say that clearly instead of skipping it.
- The conclusion must be a final answer that separates document evidence from internet evidence when both are present.
- Keep points and source_analysis entries clear, screen-readable, and specific rather than long paragraphs.
- The "sources" array must contain exact source filenames for document evidence and exact full URLs for internet evidence.
- Keep all citations and references completely intact and precise."""


class LLM:
    def __init__(self, api_key=None, provider=None, groq_api_key=None, groq_model=None, gemini_model=None, ollama_model=None):
        self.last_augmented_prompt = None
        self.provider = (provider if provider is not None else os.environ.get("MODEL_PROVIDER", "gemini")).strip().lower()
        
        self.api_key = api_key if api_key is not None else (os.environ.get("API_KEY") or os.environ.get("GEMINI_API_KEY"))
        if self.api_key:
            self.api_key = self.api_key.strip()
            
        self.groq_api_key = groq_api_key if groq_api_key is not None else os.environ.get("GROQ_API_KEY", "")
        if self.groq_api_key:
            self.groq_api_key = self.groq_api_key.strip()
            
        self.groq_model = (groq_model if groq_model is not None else os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")).strip()
        self.gemini_model = (gemini_model if gemini_model is not None else os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")).strip()
        self.ollama_model = (ollama_model if ollama_model is not None else os.environ.get("OLLAMA_MODEL", "gemma3:4b")).strip()
        self.client = None

        self.active_provider = self._resolve_provider()
        self._initialize_client()
        print(f"[LLM] Selected active model provider: '{self.active_provider}'")

    def _gemini_available(self):
        if not self.api_key:
            return False
        if genai is None:
            print("[LLM] Gemini key is configured, but google-genai is not installed.")
            return False
        return True

    def _resolve_provider(self):
        if self.provider == "groq":
            if self.groq_api_key:
                return "groq"
            if self._gemini_available():
                print("[LLM] Groq selected but GROQ_API_KEY missing. Falling back to Gemini.")
                return "gemini"
            print("[LLM] Groq selected but GROQ_API_KEY missing. Falling back to Ollama.")
            return "ollama"

        if self.provider == "gemini":
            if self._gemini_available():
                return "gemini"
            if self.groq_api_key:
                print("[LLM] Gemini unavailable. Falling back to Groq.")
                return "groq"
            print("[LLM] Gemini unavailable. Falling back to Ollama.")
            return "ollama"

        if self.provider != "ollama":
            print(f"[LLM] Unknown provider '{self.provider}'. Falling back to Ollama.")
        return "ollama"

    def _initialize_client(self):
        if self.active_provider == "gemini":
            self.client = genai.Client(api_key=self.api_key)
            return

        if self.active_provider == "groq":
            try:
                from groq import Groq
                self.client = Groq(api_key=self.groq_api_key)
                return
            except ImportError:
                print("[LLM] Groq selected, but the groq package is not installed.")
                if self._gemini_available():
                    self.active_provider = "gemini"
                    self.client = genai.Client(api_key=self.api_key)
                    return
                self.active_provider = "ollama"

        self._detect_ollama_model()

    def _detect_ollama_model(self):
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            response.raise_for_status()
            models = [model.get("name") for model in response.json().get("models", []) if model.get("name")]
        except Exception as e:
            print(f"[OLLAMA] Could not list local models: {e}. Defaulting to '{self.ollama_model}'")
            return

        if not models:
            return

        if self.ollama_model in models:
            return

        for name in models:
            if name.startswith(("gemma", "llama", "mistral", "qwen")):
                self.ollama_model = name
                print(f"[OLLAMA] Using detected model: '{self.ollama_model}'")
                return

        self.ollama_model = models[0]
        print(f"[OLLAMA] Using detected model: '{self.ollama_model}'")

    def _call(self, system_prompt, user_input):
        if self.active_provider == "ollama":
            print(f"[OLLAMA] Generating content with model: '{self.ollama_model}'")
            payload = {
                "model": self.ollama_model,
                "prompt": user_input,
                "system": system_prompt,
                "stream": False
            }
            try:
                r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
                r.raise_for_status()
                response_text = r.json().get("response", "").strip()
                if not response_text:
                    raise Exception("Ollama returned an empty response.")
                return response_text
            except Exception as e:
                print(f"[OLLAMA ERROR] Request to Ollama failed: {e}")
                raise Exception(f"Failed to query local Ollama model '{self.ollama_model}': {e}")
        elif self.active_provider == "groq":
            print(f"[GROQ] Generating content with model: '{self.groq_model}'")
            try:
                kwargs = {
                    "model": self.groq_model,
                    "messages": [],
                    "temperature": 0.2,
                    "top_p": 1,
                    "stream": False
                }
                
                if "openai/gpt-oss-120b" in self.groq_model or "reasoning" in self.groq_model:
                    kwargs["reasoning_effort"] = "medium"

                if system_prompt:
                    kwargs["messages"].append({"role": "system", "content": system_prompt})
                kwargs["messages"].append({"role": "user", "content": user_input})

                completion = self.client.chat.completions.create(**kwargs)
                response_text = (completion.choices[0].message.content or "").strip()
                if not response_text:
                    raise Exception("Groq returned an empty response.")
                return response_text
            except Exception as e:
                print(f"[GROQ ERROR] Request to Groq failed: {e}")
                raise Exception(f"Failed to query Groq model '{self.groq_model}': {e}")
        else:
            try:
                response = self.client.models.generate_content(
                    model=self.gemini_model,
                    contents=f"{system_prompt}\n\nInput: {user_input}"
                )
                response_text = (getattr(response, "text", "") or "").strip()
                if not response_text:
                    raise Exception("Gemini returned an empty response.")
                return response_text
            except Exception as e:
                print(f"[GEMINI ERROR] Request to Gemini failed: {e}")
                raise Exception(f"Failed to query Gemini model '{self.gemini_model}': {e}")

    def get_search_query(self, user_query: str):
        raw_search = self._call(SEARCH_PROMPT, user_query)
        return self._clean_search_keyword(raw_search, user_query)

    def get_semantic_query(self, user_query):
        semantic = re.sub(r"\s+", " ", self._call(SEMANTIC_PROMPT, user_query)).strip()
        return semantic or user_query.strip()

    def get_web_search_query(self, user_query):
        web_query = re.sub(r"\s+", " ", self._call(WEB_SEARCH_PROMPT, user_query)).strip()
        web_query = re.sub(r"^[-*`\"']+|[-*`\"']+$", "", web_query).strip()
        return web_query or f"{user_query.strip()} Jeffrey Epstein records"

    def _clean_search_keyword(self, raw_search, fallback_query):
        raw_search = re.sub(r"(?i)^output:\s*", "", str(raw_search or "")).strip()
        match = re.search(r"[A-Za-z][A-Za-z'-]*", raw_search)
        if match:
            return match.group(0).strip("'-").title()

        fallback = re.search(r"[A-Za-z][A-Za-z'-]*", fallback_query or "")
        return fallback.group(0).strip("'-").title() if fallback else str(fallback_query or "").strip()

    def reformulate(self, user_query: str) -> tuple:
        search = self.get_search_query(user_query)
        semantic = self.get_semantic_query(user_query)
        return search, semantic

    def _format_context_chunk(self, chunk):
        source = chunk.get("source", "Unknown source")
        url = chunk.get("url", "")
        title = chunk.get("title", "")
        source_type = chunk.get("type") or ("internet" if url or str(source).startswith("WEB_") else "document")
        citation = chunk.get("citation") or (url if source_type == "internet" and url else source)

        lines = [
            f"Source ID: {source}",
            f"Source Type: {source_type}",
            f"Citation: {citation}",
        ]
        if title:
            lines.append(f"Title: {title}")
        if url:
            lines.append(f"Internet URL: {url}")
        lines.append(f"Content:\n{chunk.get('chunk', '')}")
        return "\n".join(lines)

    def _strip_json_wrapper(self, text):
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return cleaned[start:end + 1]
        return cleaned

    def _listify(self, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _source_citation(self, chunk):
        source = str(chunk.get("source", "")).strip()
        url = str(chunk.get("url", "")).strip()
        source_type = chunk.get("type") or ("internet" if url or source.startswith("WEB_") else "document")
        return url if source_type == "internet" and url else source

    def _source_type(self, chunk):
        return "internet" if self._source_citation(chunk).startswith(("http://", "https://")) else "document"

    def _source_excerpt(self, chunk, limit=260):
        text = re.sub(r"\s+", " ", str(chunk.get("chunk", ""))).strip()
        if not text:
            return "No readable text was available from this source chunk."
        if len(text) > limit:
            return f"{text[:limit].rstrip()}..."
        return text

    def _normalize_internet_citations(self, answer_text, chunks):
        citation_map = {}
        for chunk in chunks:
            url = chunk.get("url", "")
            source = chunk.get("source", "")
            if not url or not source:
                continue
            citation_map[source] = url
            citation_map[f"[{source}]"] = url

        cleaned = self._strip_json_wrapper(answer_text)
        try:
            payload = json.loads(cleaned)
        except Exception:
            normalized = answer_text
            for placeholder, url in citation_map.items():
                normalized = normalized.replace(placeholder, url)
            return normalized

        if not isinstance(payload, dict):
            return answer_text

        points = self._listify(payload.get("points"))
        payload["points"] = points

        for point in points:
            if not isinstance(point, dict):
                continue

            if isinstance(point.get("text"), str):
                for placeholder, url in citation_map.items():
                    point["text"] = point["text"].replace(placeholder, url)

            normalized_sources = []
            for source in self._listify(point.get("sources")):
                source_text = str(source)
                normalized_sources.append(citation_map.get(source_text, citation_map.get(source_text.strip("[]"), source_text)))
            point["sources"] = normalized_sources

        normalized_conclusion = []
        for item in self._listify(payload.get("conclusion")):
            item_text = str(item)
            for placeholder, url in citation_map.items():
                item_text = item_text.replace(placeholder, url)
            normalized_conclusion.append(item_text)
        payload["conclusion"] = normalized_conclusion

        source_analysis = []
        for item in self._listify(payload.get("source_analysis")):
            if not isinstance(item, dict):
                continue

            source_text = str(item.get("source", ""))
            item["source"] = citation_map.get(source_text, citation_map.get(source_text.strip("[]"), source_text))

            if isinstance(item.get("relevance"), str):
                for placeholder, url in citation_map.items():
                    item["relevance"] = item["relevance"].replace(placeholder, url)

            findings = []
            for finding in self._listify(item.get("key_findings")):
                finding_text = str(finding)
                for placeholder, url in citation_map.items():
                    finding_text = finding_text.replace(placeholder, url)
                findings.append(finding_text)
            item["key_findings"] = findings
            source_analysis.append(item)

        seen_sources = {str(item.get("source", "")) for item in source_analysis}
        for chunk in chunks:
            citation = self._source_citation(chunk)
            if not citation or citation in seen_sources:
                continue

            source_analysis.append({
                "source": citation,
                "type": self._source_type(chunk),
                "relevance": "Retrieved as context for this question; the model did not provide a separate source note.",
                "key_findings": [self._source_excerpt(chunk)],
            })
            seen_sources.add(citation)

        payload["source_analysis"] = source_analysis

        return json.dumps(payload, ensure_ascii=False)

    def answer(self, user_query, top_chunks):
        context = "\n\n".join([self._format_context_chunk(c) for c in top_chunks])
        prompt = f"{ANSWER_PROMPT}\n\nContext:\n{context}\n\nQuestion: {user_query}"
        
        self.last_augmented_prompt = prompt
        print("\n" + "="*40 + " [RAG LAST AUGMENTED PROMPT] " + "="*40)
        print(prompt)
        print("="*109 + "\n")
        
        raw_answer = self._call("", prompt)
        return self._normalize_internet_citations(raw_answer, top_chunks)
