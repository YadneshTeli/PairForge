"""Compatibility scoring from profile text and shared skills."""

from __future__ import annotations

import os
from typing import Any

from app.embeddings import cosine, embed
from models.recommendation_model import signal_boost


def _jaccard(left: list[str], right: list[str]) -> float:
    a = {item.lower() for item in left}
    b = {item.lower() for item in right}
    if not a and not b:
        return 0.5
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def _connect():
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    import psycopg2

    return psycopg2.connect(url)


def load_profile(profile_id: str) -> dict[str, Any] | None:
    conn = _connect()
    if conn is None:
        return None
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT p.bio, p.experience_level, p.interests,
                           COALESCE(array_agg(s.name) FILTER (WHERE s.name IS NOT NULL), '{}')
                    FROM profiles p
                    LEFT JOIN user_skills us ON us.profile_id = p.id
                    LEFT JOIN skills s ON s.id = us.skill_id
                    WHERE p.id = %s OR p.user_id = %s
                    GROUP BY p.id
                    """,
                    (profile_id, profile_id),
                )
                row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return None
    interests = list(row[2] or [])
    skills = list(row[3] or [])
    return {
        "bio": row[0] or "",
        "experience_level": row[1] or "",
        "interests": interests,
        "skills": skills,
    }


def profile_text(profile: dict[str, Any]) -> str:
    return " ".join(
        [
            profile.get("bio") or "",
            profile.get("experience_level") or "",
            " ".join(profile.get("skills") or []),
            " ".join(profile.get("interests") or []),
        ]
    ).strip()


async def compute_compatibility_score(user_a_id: str, user_b_id: str) -> float | None:
    left = load_profile(user_a_id)
    right = load_profile(user_b_id)
    if not left or not right:
        return None
    similarity = cosine(embed(profile_text(left)), embed(profile_text(right)))
    shared = _jaccard(left["skills"], right["skills"])
    boost = signal_boost(user_a_id, user_b_id)
    score = 0.5 * similarity + 0.4 * shared + 0.1 * boost
    return max(0.0, min(1.0, score))
