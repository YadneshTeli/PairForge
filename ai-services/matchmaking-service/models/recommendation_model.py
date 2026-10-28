"""Swipe and message signals used as a light ranking boost."""

from __future__ import annotations

import json
import os
from collections import defaultdict

_signals: dict[str, list[dict]] = defaultdict(list)


def record_signal(user_id: str, target_id: str, signal: str) -> None:
    _signals[user_id].append({"target_id": target_id, "signal": signal})
    url = os.getenv("REDIS_URL")
    if not url:
        return
    try:
        import redis

        client = redis.from_url(url, socket_connect_timeout=0.3)
        client.lpush(f"signals:{user_id}", json.dumps({"target_id": target_id, "signal": signal}))
        client.ltrim(f"signals:{user_id}", 0, 199)
        client.close()
    except Exception:
        return


def signal_boost(user_id: str, candidate_id: str) -> float:
    hits = [
        item
        for item in _signals.get(user_id, [])
        if item["target_id"] == candidate_id and item["signal"] in {"like", "message"}
    ]
    if hits:
        return 1.0
    return 0.5
