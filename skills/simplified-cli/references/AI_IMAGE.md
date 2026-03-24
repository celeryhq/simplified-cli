# AI Image Generation

Generate images from text prompts or reference images using state-of-the-art AI models.

---

## Commands

### `ai-image:generate`

Submit an image generation request. Async — returns `art_variation_id` immediately.

| Option | Type | Required | Description |
|---|---|---|---|
| `--model` | string | Yes | Model ID (e.g. `flux.flux-realism`, `openai.imgen`) |
| `--capability` | string | No | `prompt` (default), `reference_image`, `multiple_images` |
| `--prompt` | string | Yes | Text description of the image |
| `--aspect-ratio` | string | No | e.g. `1:1`, `16:9`, `9:16` (model-dependent) |
| `--count` | number | No | Number of images to generate (1–4, default: 1) |
| `--negative-prompt` | string | No | What NOT to include (model-dependent) |
| `--reference-images` | string | No | Comma-separated asset UUIDs (required for `reference_image` / `multiple_images`) |
| `--seed` | number | No | Random seed for reproducible results (model-dependent) |
| `--properties` | string | No | Comma-separated style slugs (e.g. `cinematic,photography`) |
| `--wait` | boolean | No | Poll until done and print `[{ asset_id, url }]` |

**Without `--wait`:** prints `{ task_id, id, art_variation_id }` and shows polling hint.

**With `--wait`:** polls every 3s (timeout 180s), prints `[{ asset_id, url }]` on completion.

---

### `ai-image:status`

Poll the status of a generation task.

| Option | Type | Required | Description |
|---|---|---|---|
| `--id` | string | Yes | `art_variation_id` from `ai-image:generate` |

**Job status values:** `CREATED` → `PENDING` → `PROCESSING` → `RENDERING` → `DONE` / `FAILED`

When `DONE`, response includes `images: [{ asset_id, url }]` with signed CDN URLs.

---

### `ai-image:models`

List available models. No authentication required.

| Option | Type | Required | Description |
|---|---|---|---|
| `--model-id` | string | No | Filter by model ID |
| `--capability` | string | No | Filter by capability: `prompt`, `reference_image`, `multiple_images` |

**Available models (as of March 2026):**

`flux.flux-realism`, `flux.flux-kontext-pro`, `flux.flux-kontext-max`, `flux.flux-1.1-pro-ultra`, `flux.flux-2-pro`, `flux.flux-schnell`, `flux.dev`, `recraft.recraft`, `ideogram.ideogram-v3-turbo`, `stability.diffusion`, `google.imagen-4.0-generate-001`, `google.imagen-4.0-fast-generate-001`, `google.gemini-2.5-flash-image`, `openai.imgen`, `openai.imgen-1.5`, `qwen.qwen-image`, `qwen.qwen-image-edit`, `bytedance.seedream-4`, `bytedance.seedream-4.5`

---

## Examples

```bash
# List all models supporting text-to-image
simplified ai-image:models --capability prompt

# Full field definitions for a specific model + capability
simplified ai-image:models --model-id flux.flux-realism --capability prompt

# Generate a landscape image and wait
simplified ai-image:generate \
  --model flux.flux-realism \
  --prompt "A stunning sunset over mountains, photorealistic, 8k" \
  --aspect-ratio 16:9 \
  --count 2 \
  --wait

# Generate without waiting (get art_variation_id)
simplified ai-image:generate \
  --model flux.flux-schnell \
  --prompt "A cute cat on a windowsill"

# Check status manually
simplified ai-image:status --id "<art_variation_id>"

# Style transfer from a reference image
simplified ai-image:generate \
  --model flux.flux-kontext-pro \
  --capability reference_image \
  --prompt "Transform to watercolor painting style" \
  --reference-images "<asset-uuid>" \
  --wait
```
