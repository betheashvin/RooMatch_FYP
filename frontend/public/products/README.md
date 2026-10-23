# Product images

Drop furniture photos in **this folder** and they show up automatically — as a
thumbnail in the catalog rail and as the item on the room canvas (instead of the
plain coloured box).

## How it works

Vite serves everything in `frontend/public/` at the site root. A file here at
`frontend/public/products/lamp-001.jpg` is reachable at the URL
`/products/lamp-001.jpg`, which is exactly what the catalog points at.

Each product in `backend/app/data/catalog.json` has an `"image"` field, already
set to `"/products/<id>.jpg"`. So all you do is save a file whose name matches
the product id:

| product id | save file as                     |
|------------|-----------------------------------|
| sofa-001   | `products/sofa-001.jpg`           |
| sofa-002   | `products/sofa-002.jpg`           |
| chair-001  | `products/chair-001.jpg`          |
| table-001  | `products/table-001.jpg`          |
| tv-001     | `products/tv-001.jpg`             |
| table-002  | `products/table-002.jpg`          |
| shelf-001  | `products/shelf-001.jpg`          |
| rug-001    | `products/rug-001.jpg`            |
| lamp-001   | `products/lamp-001.jpg`           |
| ott-001    | `products/ott-001.jpg`            |

Missing files are harmless: the canvas falls back to the coloured box + name,
and the palette hides the broken thumbnail. So you can add images one at a time.

## Notes

- **Format / name:** the catalog uses `.jpg`. If you have a `.png` or `.webp`,
  either convert it, or change that product's `"image"` path in `catalog.json`
  to match your filename (e.g. `"/products/lamp-001.png"`).
- **Top-down vs. photo:** the canvas stretches the image into the item's
  footprint (seen from above). A plain front-facing product photo will look a
  bit squashed; a simple top-view or square icon reads best on the plan.
- No rebuild needed in dev — Vite picks up new files in `public/` on the fly.
