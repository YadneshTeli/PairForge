from app.embeddings import EmbeddingService
from sklearn.metrics.pairwise import cosine_similarity

embedding_service = EmbeddingService()


async def compute_compatibility_score(user_a_id: str, user_b_id: str):
    """
    Temporary mock implementation.
    Later this will fetch real user profiles from database.
    """

    # Example developer profiles (mock data)
    profiles = {
        "user1": "python fastapi docker machine-learning",
        "user2": "javascript react node frontend",
        "user3": "python pandas data-science ai",
        "user4": "java spring microservices backend"
    }

    profile_a = profiles.get(user_a_id, "")
    profile_b = profiles.get(user_b_id, "")

    vectors = embedding_service.create_embeddings([profile_a, profile_b])

    similarity = cosine_similarity(vectors[0:1], vectors[1:2])
    
    return float(similarity[0][0])