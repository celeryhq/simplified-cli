# Image Tools Reference

AI-powered image processing. Most operations are **asynchronous** — they return a `task_id`.

## Async pattern

```bash
# Option A: get task_id, poll manually
simplified image:upscale --url "https://example.com/photo.jpg" --scale 4
# → { "task_id": "abc123" }
simplified image:task --id abc123

# Option B: --wait flag (auto-polls every 2s, times out after 120s)
simplified image:upscale --url "https://example.com/photo.jpg" --scale 4 --wait
```

---

## Commands

### `image:blur-background` ⚡ synchronous

Blur the background of an image. Returns the processed image URL directly.

```bash
simplified image:blur-background \
  --url "https://example.com/photo.jpg" \
  --blur 50
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--url` | string | yes | Source image URL |
| `--blur` | number | yes | Blur intensity (1–100) |

---

### `image:remove-background`

Remove image background. Optionally replace with a color or auto-crop.

```bash
simplified image:remove-background \
  --url "https://example.com/photo.jpg" \
  --wait

# With options
simplified image:remove-background \
  --url "https://example.com/photo.jpg" \
  --magic-crop \
  --format png \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--magic-crop` | boolean | false | Auto-crop to subject after removal |
| `--bg-color` | string | — | Fill background with hex color (e.g. `#ffffff`) |
| `--format` | `png` \| `jpeg` | — | Output format |
| `--wait` | boolean | false | Block until done |

---

### `image:convert`

Convert image to a different format.

```bash
simplified image:convert \
  --url "https://example.com/photo.jpg" \
  --format webp \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--format` | `jpeg` \| `png` \| `webp` \| `bmp` \| `jpg` | `jpg` | Output format |
| `--wait` | boolean | false | Block until done |

---

### `image:upscale`

Increase image resolution by 2×, 4×, or 8×.

```bash
simplified image:upscale \
  --url "https://example.com/photo.jpg" \
  --scale 4 \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--scale` | `2` \| `4` \| `8` | `2` | Scale factor |
| `--wait` | boolean | false | Block until done |

---

### `image:restore`

Restore and enhance an old or damaged photo.

```bash
simplified image:restore \
  --url "https://example.com/old-photo.jpg" \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--scale` | number | `1` | Scale factor |
| `--wait` | boolean | false | Block until done |

---

### `image:generative-fill`

AI inpainting — fill a region of an image using a text prompt.

```bash
simplified image:generative-fill \
  --url "https://example.com/photo.jpg" \
  --prompt "a sunny beach" \
  --mask-url "https://example.com/mask.png" \
  --count 4 \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--prompt` | string | — | What to generate in the filled area |
| `--mask-url` | string | — | Mask image URL (white = fill area) |
| `--negative-prompt` | string | — | What to avoid |
| `--count` | number | `4` | Number of result variants |
| `--wait` | boolean | false | Block until done |

---

### `image:outpaint`

Extend an image beyond its original borders.

```bash
simplified image:outpaint \
  --url "https://example.com/photo.jpg" \
  --mask-url "https://example.com/mask.png" \
  --prompt "continue the forest scene" \
  --guidance-scale 7.5 \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--mask-url` | string | — | Mask defining the extension area |
| `--prompt` | string | — | Content generation prompt |
| `--negative-prompt` | string | — | What to avoid |
| `--guidance-scale` | number | `7.5` | Prompt adherence strength |
| `--count` | number | `4` | Number of result variants |
| `--wait` | boolean | false | Block until done |

---

### `image:magic-inpaint`

Place an object or subject into a new scene using AI.

```bash
simplified image:magic-inpaint \
  --url "https://example.com/subject.jpg" \
  --prompt "sitting in a coffee shop" \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--prompt` | string | — | Scene description |
| `--scale` | number | `2` | Scale factor |
| `--wait` | boolean | false | Block until done |

---

### `image:pix-to-pix`

Transform an image based on a text instruction.

```bash
simplified image:pix-to-pix \
  --url "https://example.com/photo.jpg" \
  --prompt "make it look like a watercolor painting" \
  --count 4 \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source image URL |
| `--prompt` | string | — | Transformation instruction |
| `--guidance-scale` | number | `1` | Image guidance strength |
| `--count` | number | `4` | Number of result variants |
| `--wait` | boolean | false | Block until done |

---

### `image:replace`

Replace image background with transparent, a solid color, or another image.

```bash
# Transparent background
simplified image:replace \
  --url "https://example.com/photo.jpg" \
  --replace-type transparent \
  --wait

# Solid color background
simplified image:replace \
  --url "https://example.com/photo.jpg" \
  --replace-type color \
  --replace-color "#f0f0f0" \
  --wait

# Replace with another image
simplified image:replace \
  --url "https://example.com/photo.jpg" \
  --replace-type image \
  --replace-image "https://example.com/background.jpg" \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--url` | string | yes | Source image URL |
| `--replace-type` | `transparent` \| `color` \| `image` | yes | Replacement type |
| `--replace-color` | string | when `color` | Hex color (e.g. `#ffffff`) |
| `--replace-image` | string | when `image` | Background image URL |
| `--wait` | boolean | false | Block until done |

---

### `image:sd-scribble`

Generate an image from a sketch or scribble using Stable Diffusion.

```bash
simplified image:sd-scribble \
  --prompt "a cozy living room" \
  --negative-prompt "blurry, low quality" \
  --url "https://example.com/sketch.png" \
  --count 4 \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--prompt` | string | yes | Generation prompt |
| `--negative-prompt` | string | yes | Things to avoid |
| `--url` | string | — | Scribble / sketch image URL |
| `--resolution` | number | — | Output resolution |
| `--steps` | number | — | Diffusion steps |
| `--guidance-scale` | number | — | Prompt adherence strength |
| `--count` | number | `4` | Number of result variants |
| `--wait` | boolean | false | Block until done |

---

### `image:task`

Check the status of any async image processing task.

```bash
simplified image:task --id abc123
```

**Response fields:** `task_id`, `status`, `result`, `error`

**Status values:** `pending` | `processing` | `completed` | `failed`
