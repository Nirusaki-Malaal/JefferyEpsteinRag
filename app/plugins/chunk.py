import asyncio

class Chunker():
    async def overlap_chunker(self , file_content,name, chunk_size=200, overlap=50):
        if chunk_size <= overlap:
            raise ValueError("Invalid chunk_size and overlap")
        chunks = []
        step = chunk_size - overlap
        for i in range(0, len(file_content),step ):
            chunks.append({"chunk":file_content[i:i+chunk_size], "source" : name})
        return chunks

    async def create_chunks(self, lst):
        tasks = []
        for dicc in lst:
            with open(dicc.get("TEXT_PATH", ""), "r") as f_d:
                file_content = f_d.read()
            tasks.append(self.overlap_chunker(file_content,dicc.get("NAME", "")))
        chunks = await asyncio.gather(*tasks)
        flat = []
        for chunk_list in chunks:
            flat.extend(chunk_list)
        return flat