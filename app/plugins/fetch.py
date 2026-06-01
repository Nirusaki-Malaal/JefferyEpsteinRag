import os, httpx, asyncio

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
        end = -(-num // 10)
        sem = asyncio.Semaphore(5)
        link_list = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            tasks = [self.fetch_page(client, sem, query, i) for i in range(1, end + 1)]
            pages = await asyncio.gather(*tasks)
        for hits in pages:
            for j in hits:
                if len(link_list) == num:
                    return link_list
                url = j.get("_source", {}).get("ORIGIN_FILE_URI", "")
                file_name = j.get("_source", {}).get("ORIGIN_FILE_NAME", "")
                peek = '\n'.join(j.get("highlight", {}).get("content", []))
                link_list.append({"URL": url, "NAME": file_name, "PEEK": peek})
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
        shutil.rmtree(BASE_URL)
        os.makedirs(BASE_URL, exist_ok=True)



if __name__ == "__main__":
    os.makedirs(BASE_URL, exist_ok=True)
    api = API()
    links = asyncio.run(api.fetch("hello",100))
    dir = asyncio.run(api.download(links))
    print(dir, '\n', len(dir))