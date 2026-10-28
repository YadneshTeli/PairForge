"""Rank other profiles by embedding similarity."""

from __future__ import annotations

import os

from app.embeddings import cosine, embed
from app.scoring import profile_text
from models.recommendation_model import signal_boost


def _candidate_rows(user_id: str) -> list[dict]:
    url = os.getenv("DATABASE_URL")
    if not url:
        return []
    import psycopg2

    conn = psycopg2.connect(url)
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT p.id::text, p.bio, p.experience_level, p.interests,
                           COALESCE(array_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '{}')
                    FROM profiles p
                    LEFT JOIN user_skills us ON us.profile_id = p.id
                    LEFT JOIN skills s ON s.id = us.skill_id
                    WHERE p.id::text <> %s AND p.user_id::text <> %s AND p.visibility = 'public'
                    GROUP BY p.id
                    LIMIT 200
                    """,
                    (user_id, user_id),
                )
                rows = cur.fetchall()
    finally:
        conn.close()
    profiles = []
    for row in rows:
        profiles.append(
            {
                "id": row[0],
                "bio": row[1] or "",
                "experience_level": row[2] or "",
                "interests": list(row[3] or []),
                "skills": list(row[4] or []),
            }
        )
    return profiles


async def find_similar_users(user_id: str, limit: int = 10) -> list[dict]:
    from app.scoring import load_profile

    anchor = load_profile(user_id)
    if not anchor:
        return []
    anchor_vector = embed(profile_text(anchor))
    ranked = []
    for candidate in _candidate_rows(user_id):
        similarity = cosine(anchor_vector, embed(profile_text(candidate)))
        boost = signal_boost(user_id, candidate["id"])
        ranked.append(
            {
                "user_id": candidate["id"],
                "score": round(0.85 * similarity + 0.15 * boost, 4),
            }
        )
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:limit]
