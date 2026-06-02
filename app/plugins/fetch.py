import os, httpx, asyncio
from .ocr import BASE_DIR
current_dir = os.path.dirname(os.path.abspath(__file__))
BASE_URL = os.path.abspath(os.path.join(current_dir, "..", "..", "downloads"))
COOKIES = {"ak_bmsc":"bypass", "justiceGovAgeVerified": "true"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0",
    "Referer": "https://www.justice.gov/epstein",
    "x-queueit-ajaxpageurl": "https://www.justice.gov/epstein",
}

class API():

    async def fetch_page(self, client, sem, query, i) -> list:
        try:
            async with sem:
                res = await client.get(
                    f'https://www.justice.gov/multimedia-search?keys="{query}"&page={i}',
                    headers=HEADERS
                )
                return res.json().get("hits", {}).get("hits", [])
        except Exception as e:
           print(f"[ERROR] page {i} — {e}")
           return []
        
    async def fetch(self,query,num=10) -> list:
        sem = asyncio.Semaphore(5)
        link_list = []
        page_index = 0
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            while len(link_list) < num:
                tasks = [self.fetch_page(client, sem, query, i) for i in range(page_index, page_index + 3)]
                pages = await asyncio.gather(*tasks)
                page_index += 3
                
                found_any = False
                for hits in pages:
                    if not hits:
                        continue
                    found_any = True
                    for j in hits:
                        if len(link_list) >= num:
                            break
                        url = j.get("_source", {}).get("ORIGIN_FILE_URI", "")
                        if not url.lower().endswith(".pdf"):
                            continue
                            
                        file_name = j.get("_source", {}).get("ORIGIN_FILE_NAME", "")
                        peek = '\n'.join(j.get("highlight", {}).get("content", []))
                        link_list.append({"URL": url, "NAME": file_name, "PEEK": peek})
                        
                    if len(link_list) >= num:
                        break
                        
                if not found_any:
                    break
                    
        return link_list

    async def download_link(self,client,sem, link) -> str:
        try:
            async with sem:
                res = await client.get(link.get("URL", ""), headers=HEADERS , cookies=COOKIES)
            dir = f"{BASE_URL}/{link.get('NAME', '')}"
            with open(dir, "wb") as f:
                f.write(res.content)
            return {**link, "PATH": dir}
        except Exception as e:
            print(f"Error {link.get('NAME', '')} - {e}")
            return None
    
    async def download(self, links, verbose=True) -> list:
      try:
        sem = asyncio.Semaphore(15)
        async with httpx.AsyncClient(timeout=60.0) as client:
                tasks = []
                for link in links:
                    path = f"{BASE_URL}/{link['NAME']}"
                    if not os.path.exists(path):
                        tasks.append(self.download_link(client, sem, link))
                
                downloaded = await asyncio.gather(*tasks)
                
                result = []
                for link in links:
                    path = f"{BASE_URL}/{link['NAME']}"
                    if os.path.exists(path):
                        result.append({**link, "PATH": path})
                
                if(verbose):
                    print(f"Done {len(downloaded)}/{len(links)} some files are already present")

                return result
      except Exception as e:
        print(e)
        return []
    
    async def refresh(self) -> None:
        import shutil
        if os.path.exists(BASE_URL):
            shutil.rmtree(BASE_URL, ignore_errors=True)
        if os.path.exists(BASE_DIR):
            shutil.rmtree(BASE_DIR, ignore_errors=True)
        os.makedirs(BASE_URL, exist_ok=True)
        os.makedirs(BASE_DIR, exist_ok=True)



if __name__ == "__main__":
    os.makedirs(BASE_URL, exist_ok=True)
    api = API()
    links = asyncio.run(api.fetch("hello",100))
    dir = asyncio.run(api.download(links))
    print(dir, '\n', len(dir))
