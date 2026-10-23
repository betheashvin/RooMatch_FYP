"""Style-similarity scoring for the recommendation engine.

Two products are "stylistically close" either by their precomputed CLIP image
embeddings (the richer signal, produced offline by scripts/embed_catalog.py) or,
when an embedding is missing, by overlap of their hand-authored style tags. The
engine prefers CLIP whenever both items carry an embedding and falls back to
tags otherwise, so recommendations work before the embeddings are built.

Only lightweight vector math runs here (pure-Python cosine) — the heavy CLIP
model is used offline to produce the embeddings, never at request time, which
keeps the API server within the project's CPU/RAM budget.
"""

from math import sqrt

from ..models.product import Product


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity of two equal-length vectors, in [-1, 1]. Returns 0 for
    empty, mismatched, or zero-magnitude inputs."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sqrt(sum(x * x for x in a))
    nb = sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def tag_similarity(a: list[str], b: list[str]) -> float:
    """Jaccard overlap of two style-tag sets, in [0, 1]."""
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def style_affinity(p: Product, q: Product) -> float:
    """How stylistically close two products are, in [0, 1].

    Uses CLIP embeddings when both products carry one; otherwise style-tag
    overlap. CLIP cosine is remapped from [-1, 1] to [0, 1] so the two signals
    share one scale.
    """
    if p.style_embedding and q.style_embedding:
        return (cosine_similarity(p.style_embedding, q.style_embedding) + 1.0) / 2.0
    return tag_similarity(p.style_tags, q.style_tags)
