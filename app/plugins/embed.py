from fastembed import TextEmbedding

class Embed:
    def __init__(self):
        self.model = TextEmbedding("BAAI/bge-small-en-v1.5")
    
    def embed_list(self, lst):
        texts = [dicc.get("chunk", "") for dicc in lst]
        embeddings = list(self.model.embed(texts))
        for i, dicc in enumerate(lst):
            dicc["embedding"] = embeddings[i]
        return lst

    def embed_query(self, query):
        embeddings = list(self.model.embed([query]))
        return embeddings[0]
