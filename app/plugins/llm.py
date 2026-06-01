from google import genai

SEARCH_PROMPT = """You are a search query optimizer for a legal document search engine focused on Epstein-related federal court documents. The search engine is highly sensitive and works best with a single keyword — always the name of the person being searched in connection with Epstein, not "Epstein" himself (since the entire database is already Epstein-related). Rules:
* Return one word only — the subject's first name
* No punctuation, no quotes, no explanation
* The input will always be a question about a person's connection to Epstein court documents
Example:
* Input: "narendra modi links with jeffrey epstein"
* Output: Narendra
* Input: "what was manmohan singh links with jeffrey epstein ?"
* Output: Manmohan"""

SEMANTIC_PROMPT = """You are a semantic search query optimizer for an AI-powered RAG bot that answers questions about the Jeffrey Epstein federal court documents. Your rephrased query will be embedded and used to find the most semantically similar chunks from OCR'd legal documents including FBI files, court filings, flight logs, witness testimonies, and investigation reports.
Your job is to rephrase the user's question into a detailed descriptive paragraph that maximizes semantic similarity with relevant document chunks.

Rules:
- Rephrase as a detailed descriptive sentence
- Include relevant context, synonyms, related concepts
- Use formal legal language matching the document style
- No bullet points, no explanation, just the rephrased query"""


ANSWER_PROMPT = """You are an AI assistant answering questions about the Jeffrey Epstein federal court documents.
You will be given relevant chunks from OCR'd legal documents and a user question.
Answer based only on the provided context. Cite the source filename for every claim.
If the context doesn't contain enough information, say so clearly."""


class LLM:
    def __init__(self, api_key):
        self.client = genai.Client(api_key=api_key)

    def _call(self, system_prompt, user_input):
        response = self.client.models.generate_content(  ## api_key or call is in a private function # maintain the fuckin abstraction
            model="gemini-3.5-flash",
            contents=f"{system_prompt}\n\nInput: {user_input}"
        )
        return response.text.strip()

    def get_search_query(self, user_query: str):
        return self._call(SEARCH_PROMPT, user_query)

    def get_semantic_query(self, user_query):
        return self._call(SEMANTIC_PROMPT, user_query)

    def reformulate(self, user_query: str) -> tuple:
        search = self.get_search_query(user_query)
        semantic = self.get_semantic_query(user_query)
        return search, semantic

    def answer(self, user_query, top_chunks):
        context = "\n\n".join([f"Source: {c['source']}\n{c['chunk']}" for c in top_chunks])
        prompt = f"{ANSWER_PROMPT}\n\nContext:\n{context}\n\nQuestion: {user_query}"
        return self._call("", prompt)