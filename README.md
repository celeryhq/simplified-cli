# simplified-cli

Social media automation CLI for [Simplified.com](https://simplified.com). Publish to 10 platforms simultaneously, analyze performance, process images and generate AI images — all output is JSON, making it ideal for scripts and AI agents.

## Installation

```bash
npm install -g simplified-cli
```

## Setup

Get your API key from **Simplified.com → Settings → API Keys**, then export it:

```bash
export SIMPLIFIED_API_KEY=your_api_key_here
```

## For AI Agents

All commands print JSON to stdout. Errors go to stderr with a non-zero exit code.

**Discovery workflow:**
1. Run `accounts:list` to get account IDs — the `id` field is required by all other commands
2. Filter by platform with `--network <platform>` if needed
3. Use `posts:create`, `analytics:*`, or `image:*` with the discovered IDs

**Async image workflow:**
- Without `--wait`: returns `{"task_id":"..."}` immediately
- With `--wait`: blocks until done (timeout: 120 s), prints final result JSON to stdout
- Manual poll: `simplified image:task --id <task_id>`
- Status values: `pending` → `completed` / `success` (result ready) or `failed`

## Commands

### Accounts

```bash
# List all connected accounts
simplified accounts:list

# Filter by platform
simplified accounts:list --network instagram
```

**Supported platforms:** `facebook` · `instagram` · `linkedin` · `tiktok` · `tiktokBusiness` · `youtube` · `pinterest` · `threads` · `google` · `bluesky`

**Response key fields:** `id` (use in `--accounts` / `-a`), `name`, `type` (platform name)

---

### Posts

```bash
# Queue a post
simplified posts:create -c "Hello world!" -a "ACCOUNT_ID" --action add_to_queue

# Publish to multiple platforms simultaneously
simplified posts:create -c "Launch day!" -a "INSTAGRAM_ID,LINKEDIN_ID,BLUESKY_ID" --action add_to_queue

# Schedule a post
simplified posts:create -c "Launching soon!" -a "ACCOUNT_ID" --action schedule \
  --date "2026-04-01 09:00"  # format: YYYY-MM-DD HH:MM, timezone: UTC (override with --timezone)

# Save as draft
simplified posts:create -c "Work in progress" -a "ACCOUNT_ID" --action draft

# Post with media
simplified posts:create -c "Check this out" -a "ACCOUNT_ID" --action add_to_queue \
  --media "https://example.com/image.jpg"

# Complex post from JSON file (multi-platform, platform-specific settings)
simplified posts:create --json post.json
```

**Actions:** `add_to_queue` · `schedule` (requires `--date "YYYY-MM-DD HH:MM"`) · `draft`

**Platform-specific settings (`--additional`):** Pass a JSON string for per-platform options (Instagram `postType`/`channel`, TikTok `privacyStatus`, YouTube `post.title`, etc.). See [`skills/simplified-social/references/PLATFORM_GUIDE.md`](skills/simplified-social/references/PLATFORM_GUIDE.md) for all options.

```bash
# Instagram Reel
simplified posts:create -c "New reel!" -a "ACCOUNT_ID" --action add_to_queue \
  --media "https://example.com/video.mp4" \
  --additional '{"instagram":{"postType":{"value":"reel"},"channel":{"value":"direct"}}}'
```

#### Manage scheduled posts

```bash
# List scheduled/published posts
simplified posts:list --accounts "ACCOUNT_ID"
simplified posts:list --accounts "ACCOUNT_ID" --category scheduled --page 2

# Update a post
simplified posts:update --post-id "POST_ID" -c "Revised caption"
simplified posts:update --post-id "POST_ID" --date "2026-04-05" --time "10:00" --timezone "UTC"
simplified posts:update --post-id "POST_ID" --media "https://example.com/new-image.jpg"

# Delete a post
simplified posts:delete --post-schedule-id "POST_ID"
simplified posts:delete --group-id "GROUP_ID"
```

#### Manage drafts

```bash
# List drafts
simplified posts:list-drafts --accounts "ACCOUNT_ID"

# Update a draft
simplified posts:update-draft --draft-id "DRAFT_ID" -c "Polished copy"

# Delete drafts
simplified posts:delete-draft --draft-ids "DRAFT_ID_1,DRAFT_ID_2"
simplified posts:delete-draft --group-id "GROUP_ID"
```

---

### Analytics

> `--to` must be today or earlier — analytics only covers historical data. Date format: `YYYY-MM-DD`.

```bash
# Aggregated KPIs (impressions, engagement, followers, publishing)
simplified analytics:aggregated -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19

# Time-series metrics (daily breakdown)
simplified analytics:range -a ACCOUNT_ID \
  --metrics "views,reach,follower_count" \
  --from 2026-03-01 --to 2026-03-19

# Per-post performance
simplified analytics:posts -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19

# Audience demographics (gender, country breakdown)
simplified analytics:audience -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19
```

---

### Image Tools

All image commands accept `--url` with a public image URL. Async commands return a `task_id` — use `--wait` to block until the result is ready (see [For AI Agents](#for-ai-agents) for async workflow details).

`image:blur-background` is synchronous — returns `{"image_url": "..."}` directly.

```bash
# Remove background (async)
simplified image:remove-background --url "https://example.com/photo.jpg" --wait

# Blur background (synchronous)
simplified image:blur-background --url "https://example.com/photo.jpg" --blur 50

# Upscale 4x (async)
simplified image:upscale --url "https://example.com/photo.jpg" --scale 4 --wait

# Convert format (async)
simplified image:convert --url "https://example.com/photo.png" --format webp --wait

# AI generative fill (async)
simplified image:generative-fill \
  --url "https://example.com/photo.jpg" \
  --prompt "replace background with a sunset beach" --wait

# Check async task status manually
simplified image:task --id "TASK_ID"
```

**All image commands:** `image:blur-background` · `image:remove-background` · `image:convert` · `image:upscale` · `image:restore` · `image:generative-fill` · `image:outpaint` · `image:magic-inpaint` · `image:pix-to-pix` · `image:replace` · `image:sd-scribble`

---

### AI Image Generation

Generate images from text prompts or reference images using 20+ AI models (Flux, Google Imagen, OpenAI, Recraft, Ideogram, Stability, Qwen, ByteDance).

```bash
# Discover available models
simplified ai-image:models
simplified ai-image:models --capability prompt

# Generate from text prompt (wait for result)
simplified ai-image:generate \
  --model flux.flux-realism \
  --prompt "A stunning sunset over mountains, photorealistic, 8k" \
  --aspect-ratio 16:9 \
  --count 2 \
  --wait

# Style transfer from a reference image
simplified ai-image:generate \
  --model flux.flux-kontext-pro \
  --capability reference_image \
  --prompt "Transform to watercolor painting style" \
  --reference-images "ASSET_UUID" \
  --wait

# Check generation status manually
simplified ai-image:status --id "ART_VARIATION_ID"
```

**Async workflow:**
- Without `--wait`: returns `{ task_id, id, art_variation_id }` immediately
- With `--wait`: polls every 3s (timeout: 180s), prints `[{ asset_id, url }]` on completion
- Manual poll: `simplified ai-image:status --id <art_variation_id>`

**Available models:** `flux.flux-realism` · `flux.flux-kontext-pro` · `flux.flux-schnell` · `google.imagen-4.0-generate-001` · `openai.imgen` · `openai.imgen-1.5` · `stability.diffusion` · `recraft.recraft` · `ideogram.ideogram-v3-turbo` · and more — run `ai-image:models` for the full list.

---

## Platform Notes

| Platform | Char limit | Key requirement |
|---|---|---|
| Bluesky | 300 | No `additional` required |
| Threads | 500 | Optional `channel` (direct / reminder) |
| Pinterest | 500 | Always requires ≥ 1 image in `--media` |
| Google Business | 1500 | No video support |
| LinkedIn | 3000 | Set `audience` (PUBLIC / CONNECTIONS / LOGGED_IN) |
| Instagram | 2200 | Requires `postType` + `channel`; stories: empty caption + 1 photo |
| Facebook | 2200 | Optional `postType` (post / reel / story) |
| TikTok | 2200 | Requires `postType` + `channel` + `post.privacyStatus` |
| TikTok Business | 2200 | Same as TikTok + `aiGenerated`, `uploadToDraft` |
| YouTube | 2200 | Requires `postType` + `post.title` (mandatory) |

Full `--additional` schemas: [`skills/simplified-social/references/PLATFORM_GUIDE.md`](skills/simplified-social/references/PLATFORM_GUIDE.md)

---

## Common workflows

### Publish content to social media

```bash
# Workflow 1: Multi-platform publish
simplified accounts:list --network instagram   # note the "id" field
simplified posts:create -c "Your content" -a "INSTA_ID,LINKEDIN_ID" --action add_to_queue
```

### Process an image and post it

```bash
# Workflow 2: Image pipeline (--wait output is pipeable)
simplified image:remove-background --url "https://example.com/photo.jpg" --wait | jq '.url'

# Post with the returned URL
simplified posts:create -c "Caption" -a "ACCOUNT_ID" --action add_to_queue \
  --media "RESULT_URL"
```

### Review campaign performance

```bash
simplified analytics:aggregated -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19
simplified analytics:posts      -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19 --per-page 5
simplified analytics:audience   -a ACCOUNT_ID --from 2026-03-01 --to 2026-03-19
```

---

## Help

```bash
simplified --help
simplified <command> --help
```

## License

MIT
