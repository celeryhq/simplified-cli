# AI Video Generation

Generate videos from text prompts or reference images using state-of-the-art AI models (Veo, Sora, Kling, Seedance, Hailuo, WAN).

---

## Commands

### `ai-video:models`

List available video models and their per-capability field schema. Always check this first — model ids, capabilities, and valid parameter values (durations, resolutions, aspect ratios) are model-specific.

| Option | Type | Required | Description |
|---|---|---|---|
| `--model-id` | string | No | Filter to one model (e.g. `veo-3`) |
| `--capability` | string | No | Show the full field schema for this capability |

- No args → lists every video model with its `id`, `provider`, `is_premium`, and capabilities.
- `--model-id` + `--capability` → the full field definitions (labels, types, `enum_values`, defaults, required flags, credit cost) for that pair.

---

### `ai-video:generate`

Submit a video generation job. Async — returns `id` (art) and `art_variation_id` (variation) immediately.

| Option | Type | Required | Description |
|---|---|---|---|
| `--model` | string | Yes | Model ID (e.g. `veo-3`, `veo-3.1`, `sora-2`, `kling-v2.5-turbo-pro`) |
| `--capability` | string | No | `prompt` (default), `reference_image`, `multiple_images`, `first_last_frame` (per-model) |
| `--prompt` | string | Yes | Text description of the video |
| `--aspect-ratio` | string | No | e.g. `16:9`, `9:16`, `1:1` (model-dependent) |
| `--duration` | number | No | Length in seconds (model-dependent, e.g. `4`/`6`/`8`) |
| `--resolution` | string | No | e.g. `720p`, `1080p` (model-dependent) |
| `--negative-prompt` | string | No | What NOT to include |
| `--reference-images` | string | No | Comma-separated asset UUIDs (for `reference_image` / `multiple_images` / `first_last_frame`) |
| `--generate-audio` | boolean | No | Generate an audio track (model-dependent) |
| `--parameters` | string | No | JSON of extra model-specific parameters, merged over the flags (JSON wins on collisions) |
| `--storage` | string | No | `asset` (persist a reusable asset), `transient` (temporary), `default` (gallery) |
| `--wait` | boolean | No | Poll until done and print the output (`file_url`, asset `id`) |

**Without `--wait`:** prints `{ task_id, id, art_variation_id, storage }` and shows the exact `ai-video:status` hint.

**With `--wait`:** polls every 30s (timeout 600s), prints the output object (`{ id, file_url, thumbnail, thumbnail_cover_image }`) on completion.

> File-typed fields (e.g. `first_frame_url`, `last_frame_url`, `image_url`) take an **asset UUID**, not a raw URL. Import/upload first with `assets:import` / `assets:upload`, then pass the UUID via `--reference-images` or `--parameters`.

---

### `ai-video:status`

Poll a generation job. The V2 video poll needs **both** ids returned by `ai-video:generate`.

| Option | Type | Required | Description |
|---|---|---|---|
| `--art-id` | string | Yes | The `id` from `ai-video:generate` (the art id) |
| `--id` | string | Yes | The `art_variation_id` from `ai-video:generate` (the variation id) |

**Job status values:** `CREATED` → `PENDING` → `PROCESSING` → `RENDERING` / `UPDATED` → `DONE` / `FAILED`

When `DONE`, the `output` object holds `file_url` (the rendered video), `thumbnail_cover_image`, and `id` (the asset UUID).

---

## Examples

```bash
# List all video models
simplified ai-video:models

# Full field definitions for a model + capability
simplified ai-video:models --model-id veo-3 --capability prompt

# Text to video, wait for the result
simplified ai-video:generate \
  --model veo-3-fast \
  --prompt "Drone shot over a neon city at night, cinematic" \
  --aspect-ratio 16:9 --resolution 1080p --duration 8 \
  --storage asset --wait

# Generate without waiting (get the ids back)
simplified ai-video:generate --model sora-2 --prompt "A paper boat sailing down a rainy street"

# Check status manually (needs BOTH ids)
simplified ai-video:status --art-id "<id>" --id "<art_variation_id>"

# First/last frame interpolation (asset UUIDs via --parameters)
simplified ai-video:generate \
  --model veo-3.1 --capability first_last_frame \
  --prompt "smooth morph between the two scenes" \
  --parameters '{"first_frame_url":"<asset-uuid>","last_frame_url":"<asset-uuid>"}' \
  --wait
```
