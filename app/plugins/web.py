import asyncio
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx


WEB_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0",
}

BLOCKED_SOURCE_DOMAINS = {
    "bing.com",
    "duckduckgo.com",
    "google.com",
    "search.google",
    "yahoo.com",
}


class PageTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in {"script", "style", "noscript", "svg"}:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in {"script", "style", "noscript", "svg"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if not self.skip_depth:
            text = data.strip()
            if text:
                self.parts.append(text)

    def text(self):
        return normalize_text(" ".join(self.parts))


def normalize_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


class WebIngestor:
    def __init__(self, max_page_chars=18000):
        self.max_page_chars = max_page_chars

    def _chunk_text(self, text, chunk_size, overlap):
        text = text.strip()
        if not text:
            return []

        chunk_size = max(int(chunk_size or 4000), 500)
        overlap = max(int(overlap or 0), 0)
        if overlap >= chunk_size:
            overlap = max(chunk_size // 5, 0)

        step = chunk_size - overlap
        return [text[i:i + chunk_size] for i in range(0, len(text), step)]

    async def _fetch_page_text(self, client, sem, url):
        if not url:
            return ""

        try:
            async with sem:
                response = await client.get(url, headers=WEB_HEADERS, follow_redirects=True)
                response.raise_for_status()
        except Exception as e:
            print(f"[WEB INGEST] Could not fetch {url}: {e}")
            return ""

        content_type = response.headers.get("content-type", "").lower()
        if "html" in content_type:
            parser = PageTextParser()
            parser.feed(response.text[: self.max_page_chars * 2])
            return parser.text()[: self.max_page_chars]

        if "text" in content_type:
            return normalize_text(response.text)[: self.max_page_chars]

        return ""

    def _search(self, query, max_results):
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=max_results * 3))

    def _is_blocked_url(self, url):
        try:
            host = urlparse(url).netloc.lower()
        except Exception:
            return True

        host = host[4:] if host.startswith("www.") else host
        return any(host == domain or host.endswith(f".{domain}") for domain in BLOCKED_SOURCE_DOMAINS)

    def _filtered_results(self, results, max_results):
        filtered = []
        seen_urls = set()

        for result in results:
            url = result.get("href", "").strip()
            if not url or url in seen_urls or self._is_blocked_url(url):
                continue

            seen_urls.add(url)
            filtered.append(result)
            if len(filtered) >= max_results:
                break

        return filtered

    async def ingest(self, query, max_results=4, chunk_size=4000, overlap=500):
        try:
            results = self._search(query, max_results=max_results)
        except Exception as e:
            print(f"[WEB INGEST] Search failed: {e}")
            return []

        results = self._filtered_results(results, max_results)
        if not results:
            print("[WEB INGEST] Search returned no usable source pages after filtering.")
            return []

        sem = asyncio.Semaphore(4)
        async with httpx.AsyncClient(timeout=20.0) as client:
            page_texts = await asyncio.gather(
                *[self._fetch_page_text(client, sem, result.get("href", "").strip()) for result in results]
            )

        chunks = []
        for index, (result, page_text) in enumerate(zip(results, page_texts), start=1):
            url = result.get("href", "").strip()
            title = normalize_text(result.get("title", ""))
            snippet = normalize_text(result.get("body", ""))
            body = normalize_text(page_text) or snippet

            if not url or not body:
                continue

            combined = "\n".join(
                part for part in [
                    f"Title: {title}" if title else "",
                    f"URL: {url}",
                    f"Search snippet: {snippet}" if snippet else "",
                    f"Page text: {body}",
                ] if part
            )

            source = f"WEB_{index}.url"
            for part_index, chunk in enumerate(self._chunk_text(combined, chunk_size, overlap), start=1):
                chunks.append({
                    "chunk": chunk,
                    "source": source,
                    "title": title,
                    "type": "internet",
                    "citation": url,
                    "url": url,
                    "part": part_index,
                })

        print(f"[WEB INGEST] Ingested {len(chunks)} web chunks from {len(results)} search results.")
        return chunks
