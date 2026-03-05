from fastapi import FastAPI
from app.scoring import compute_compatibility_score
from app.similarity import find_similar_users

app = FastAPI(title="PairForge Matchmaking Service", version="1.0.0")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "matchmaking"}

@app.post("/match/score")
async def score_match(user_a_id: str, user_b_id: str):
    score = await compute_compatibility_score(user_a_id, user_b_id)
    return {"user_a": user_a_id, "user_b": user_b_id, "compatibility_score": score}

@app.get("/match/recommendations/{user_id}")
async def get_recommendations(user_id: str, limit: int = 10):
    matches = await find_similar_users(user_id, limit=limit)
    return {"user_id": user_id, "recommendations": matches}

@app.get("/")
async def root():
    return {"message": "PairForge Matchmaking API is running"}
