# Furniture 3D models (.glb)

Drop a `.glb` model in **this folder** and the 3D view shows it in place of the
plain coloured box — same position, turn, and size as the 2D plan validated.

## How it works

Vite serves everything in `frontend/public/` at the site root, so a file here at
`frontend/public/models/sofa-001.glb` is reachable at `/models/sofa-001.glb`.
A product in `backend/app/data/catalog.json` opts in by setting a `"glb_url"`
field pointing at that path:

```json
{ "id": "sofa-001", ..., "glb_url": "/models/sofa-001.glb" }
```

Only `sofa-001` has this set so far. Any product **without** `glb_url` — or whose
file is missing/broken — just keeps showing the coloured box, so you can add
models one at a time.

| product id | set glb_url to           | save file as             |
|------------|--------------------------|--------------------------|
| sofa-001   | `/models/sofa-001.glb`   | `models/sofa-001.glb`    |
| sofa-002   | `/models/sofa-002.glb`   | `models/sofa-002.glb`    |
| chair-001  | `/models/chair-001.glb`  | `models/chair-001.glb`   |
| …          | `/models/<id>.glb`       | `models/<id>.glb`        |

(For a new product, add the matching `"glb_url"` line in `catalog.json` too.)

## Generating a model from a product photo (do this once per item)

You don't model these by hand. Use a free **image → 3D** tool to turn one
product photo into a `.glb`, then save it here. Two routes:

- **Hosted (no GPU needed, runs on their servers, free tier):**
  [Meshy](https://www.meshy.ai/), [Tripo](https://www.tripo3d.ai/), or
  [Rodin](https://hyper3d.ai/). Upload the photo → "image to 3D" → export
  **GLB** → save as `models/<id>.glb`. You only need your machine on while the
  page is open; once the file is downloaded it's yours, nothing stays running.
- **Local / open-source (needs your own GPU):** TRELLIS, Hunyuan3D, or
  Stable Fast 3D. More setup, but fully offline and free.

The model is generated **once** and stored as a static file — the app never
calls these tools at runtime, it just loads the saved `.glb`.

## What the app does to the model

- **Scales it to the real footprint.** Whatever size the exported model is, the
  viewer rescales it to the product's exact `width_cm × depth_cm × height_cm`
  so it occupies the same space the layout was validated against.
- **Recentres it** so it rests on the floor at the placed position.

Because scaling is per-axis, a model whose proportions differ a lot from the
catalog dimensions can look slightly stretched. Best results come from a `.glb`
that is **Y-up** with width along X and depth along Z (most exporters default to
this). If one looks off, we can switch to uniform scaling.

## Notes

- **Format:** must be `.glb` (binary glTF — geometry + textures in one file).
  A `.gltf` + separate textures won't load as a single URL.
- **Size:** keep files reasonably small (a few MB). They download on demand when
  the 3D tab opens.
- No rebuild needed in dev — Vite picks up new files in `public/` on the fly.
