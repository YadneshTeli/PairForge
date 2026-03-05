from app.embeddings import EmbeddingService
from sklearn.metrics.pairwise import cosine_similarity

embedding_service = EmbeddingService()


async def find_similar_users(user_id: str, limit: int = 10):

    profiles = {
        "user1": "python fastapi docker machine-learning",
        "user2": "javascript react node frontend",
        "user3": "python pandas data-science ai",
        "user4": "java spring microservices backend"
    }

    target_profile = profiles.get(user_id, "")

    user_ids = list(profiles.keys())
    profile_texts = list(profiles.values())

    vectors = embedding_service.create_embeddings(profile_texts)

    target_index = user_ids.index(user_id)
    target_vector = vectors[target_index]

    similarities = cosine_similarity([target_vector], vectors)[0]

    results = []

    for i, score in enumerate(similarities):
        if user_ids[i] != user_id:
            results.append({
                "user_id": user_ids[i],
                "similarity": float(score)
            })

    results = sorted(results, key=lambda x: x["similarity"], reverse=True)

    return results[: min(limit, len(results))]