import numpy as np

def get_score(pair):
    return pair[0]

def cosine_similarity(q_vec , lst):
    matrix = np.array([dicc["embedding"] for dicc in lst])
    scores = list(matrix @ q_vec / (np.linalg.norm(matrix, axis=1) * np.linalg.norm(q_vec)))
#    [0.99, 0.24 , 0.36] ##
    # c1    c2     c3
    indexed_pairs = list(zip(scores, lst))
    indexed_pairs.sort(reverse=True, key=get_score)
    top10 = []
    for score, chunk in indexed_pairs[:10]:
        chunk["score"] = float(score)
        top10.append(chunk)
    return top10

## a.b / (l2norm(b) * l2norm(b))