"""Offline: compute CLIP image embeddings for every catalog product.

Run this once (NOT at request time) to fill each product's `style_embedding`,
which the recommendation engine then uses for visual style similarity. The heavy
ML dependencies live in requirements-ml.txt, separate from the API runtime:

    pip install -r requirements-ml.txt
    python scripts/embed_catalog.py          # run from the backend/ directory

Product images are read from the frontend's public folder, using the same path
stored in each product's `image` field (e.g. /products/sofa-001.jpg). Products
whose image file is missing are skipped, and the engine falls back to style tags
for them. CPU is fine for this (a one-off, 10-item pass).
"""

import json
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent.parent
_CATALOG = _BACKEND / "app" / "data" / "catalog.json"
_IMAGE_ROOT = _BACKEND.parent / "frontend" / "public"  # /products/<id>.jpg lives here

_MODEL_NAME = "ViT-B-32"
_PRETRAINED = "laion2b_s34b_b79k"


def main() -> None:
    try:
        import open_clip
        import torch
        from PIL import Image
    except ImportError as exc:
        raise SystemExit(
            f"Missing ML dependency ({exc.name}). Install them first:\n"
            "    pip install -r requirements-ml.txt"
        )

    model, _, preprocess = open_clip.create_model_and_transforms(
        _MODEL_NAME, pretrained=_PRETRAINED
    )
    model.eval()

    catalog = json.loads(_CATALOG.read_text(encoding="utf-8"))
    embedded = 0
    for product in catalog:
        image_field = product.get("image")
        if not image_field:
            continue
        image_path = _IMAGE_ROOT / image_field.lstrip("/")
        if not image_path.exists():
            print(f"skip {product['id']}: no image at {image_path}")
            continue
        tensor = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            features = model.encode_image(tensor)
            features /= features.norm(dim=-1, keepdim=True)
        product["style_embedding"] = features.squeeze(0).tolist()
        embedded += 1
        print(f"embedded {product['id']}")

    _CATALOG.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"done: {embedded} product(s) embedded, catalog.json updated.")


if __name__ == "__main__":
    main()
