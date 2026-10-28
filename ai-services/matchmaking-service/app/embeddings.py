"""Text embeddings with a hashing fallback when the transformer model is unavailable."""

from __future__ import annotations

import hashlib
import os
import re

import numpy as np

_model = None
_failed = False


def _hash_embed(text: str, dims: int = 256) -> np.ndarray:
    vector = np.zeros(dims, dtype=np.float32)
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not tokens:
        return vector
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "little") % dims
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm else vector


def embed(text: str) -> np.ndarray:
    """Return a unit-ish vector. Loads sentence-transformers once, then falls back."""
    global _model, _failed
    if not _failed and _model is None and os.getenv("PAIRFORGE_DISABLE_TRANSFORMERS") != "1":
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(os.getenv("SENTENCE_MODEL", "all-MiniLM-L6-v2"))
        except Exception:
            _failed = True
    if _model is not None:
        vector = np.asarray(_model.encode(text or " "), dtype=np.float32)
        norm = float(np.linalg.norm(vector))
        return vector / norm if norm else vector
    return _hash_embed(text or "")


def cosine(left: np.ndarray, right: np.ndarray) -> float:
    denom = float(np.linalg.norm(left) * np.linalg.norm(right))
    if denom == 0:
        return 0.0
    value = float(np.dot(left, right) / denom)
    return max(0.0, min(1.0, (value + 1.0) / 2.0))
