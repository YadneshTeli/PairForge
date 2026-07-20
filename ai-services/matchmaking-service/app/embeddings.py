from sklearn.feature_extraction.text import TfidfVectorizer


class EmbeddingService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer()

    def create_embeddings(self, user_profiles):
        """
        user_profiles = [
            "python fastapi docker",
            "javascript react node",
            "python machine-learning pandas"
        ]
        """

        vectors = self.vectorizer.fit_transform(user_profiles)

        return vectors.toarray()

    def embed_single_profile(self, profile_text):
        """
        Convert one developer profile into a vector
        """

        vector = self.vectorizer.transform([profile_text])

        return vector.toarray()[0]