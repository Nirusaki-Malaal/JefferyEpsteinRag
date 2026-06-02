import numpy as np

def get_score(pair):
    return pair[0]

def cosine_similarity(q_vec, lst, top_n=10):
    matrix = np.array([dicc["embedding"] for dicc in lst])
    scores = list(matrix @ q_vec / (np.linalg.norm(matrix, axis=1) * np.linalg.norm(q_vec)))
    indexed_pairs = list(zip(scores, lst))
    indexed_pairs.sort(reverse=True, key=get_score)
    top_results = []
    for score, chunk in indexed_pairs[:top_n]:
        chunk["score"] = float(score)
        top_results.append(chunk)
    return top_results
