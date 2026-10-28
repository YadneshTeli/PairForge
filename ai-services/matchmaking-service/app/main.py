from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.scoring import compute_compatibility_score
from app.similarity import find_similar_users
from models.recommendation_model import record_signal

app = FastAPI(title="PairForge Matchmaking Service", version="1.0.0")


class ScoreRequest(BaseModel):
    user_a_id: str
    user_b_id: str


class FeedbackRequest(BaseModel):
    user_id: str
    target_id: str
    signal: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "matchmaking"}


@app.post("/match/score")
async def score_match(body: ScoreRequest):
    score = await compute_compatibility_score(body.user_a_id, body.user_b_id)
    if score is None:
        raise HTTPException(status_code=404, detail="profiles not found")
    return {"user_a": body.user_a_id, "user_b": body.user_b_id, "compatibility_score": score}


@app.get("/match/recommendations/{user_id}")
async def get_recommendations(user_id: str, limit: int = 10):
    matches = await find_similar_users(user_id, limit=limit)
    return {"user_id": user_id, "recommendations": matches}


@app.post("/match/feedback")
async def feedback(body: FeedbackRequest):
    record_signal(body.user_id, body.target_id, body.signal)
    return {"ok": True}
