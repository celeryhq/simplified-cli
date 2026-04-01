# Simplified CLI — Social Media Automation for AI Agents

![npm](https://img.shields.io/npm/v/simplified-cli) ![license](https://img.shields.io/npm/l/simplified-cli) ![platforms](https://img.shields.io/badge/platforms-10-blue) [![docs](https://img.shields.io/badge/docs-simplified.readme.io-blue)](https://simplified.readme.io/reference/introduction)

[![Featured on Product Hunt](https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=327271&theme=light)](https://www.producthunt.com/products/simplified-design/launches/simplified-design?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-simplified-design)

Agentic social media automation CLI for [Simplified.com](https://simplified.com). Schedule and publish to 10 platforms simultaneously, analyze performance, process images, and generate AI images with 20+ models — JSON-native output designed for AI agents, LLM workflows, and automated pipelines.

## What is Simplified CLI?

Simplified CLI is an open-source social media automation tool that lets AI agents and developers schedule posts, pull analytics, and generate AI images across 10 platforms (Instagram, TikTok, LinkedIn, YouTube, and more) — entirely from the command line.

## Why Simplified CLI?

| Feature | Simplified CLI | Buffer API | Hootsuite API |
|---|---|---|---|
| AI image generation | ✅ 20+ models | ❌ | ❌ |
| Agentic / LLM-ready (JSON output) | ✅ | ⚠️ partial | ⚠️ partial |
| Video tools | ✅ | ❌ | ❌ |
| Platforms | 10 | 6 | 10 |
| Open source CLI | ✅ | ❌ | ❌ |
| Claude Code plugin | ✅ | ❌ | ❌ |

Simplified CLI is the only social media scheduling tool built natively for agentic AI workflows — with JSON output, async task polling, and AI image generation built in.

## Use Cases

- **AI agents & LLM pipelines** — autonomous social media posting driven by Claude, GPT, or any LLM via tool use
- **Marketing automation** — bulk scheduling, cross-platform posting, and performance analytics from CI/CD or cron
- **Content teams** — generate AI images, remove backgrounds, and publish in a single pipeline
- **Developers** — scriptable social media API for custom automation workflows
- **Claude Code users** — install as a plugin and manage social media directly from your AI coding assistant
- **OpenClaw users** — run Simplified CLI commands directly from your open-source AI agent via shell tool use

## Installation

### npm (global)

```bash
npm install -g simplified-cli
```

### Claude Code plugin

```
/plugin marketplace add celeryhq/simplified-cli
/plugin install simplified-cli
```

## Setup

Get your API key from **Simplified.com → Settings → API Keys**, then export it:

```bash
export SIMPLIFIED_API_KEY=your_api_key_here
```

## Agentic Workflows & LLM Integration

All commands print JSON to stdout. Errors go to stderr with a non-zero exit code — making Simplified CLI a reliable tool for agentic pipelines, LLM tool use, and autonomous social media workflows.

**Discovery workflow for AI agents:**
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

### Social Media Scheduling

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

**Platform-specific settings (`--additional`):** Pass a JSON string for per-platform options (Instagram `postType`/`channel`, TikTok `privacyStatus`, YouTube `post.title`, etc.). See [`skills/simplified-cli/references/PLATFORM_GUIDE.md`](skills/simplified-cli/references/PLATFORM_GUIDE.md) for all options.

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

### Social Media Analytics & Performance Tracking

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

### AI-Powered Image Processing

All image commands accept `--url` with a public image URL. Async commands return a `task_id` — use `--wait` to block until the result is ready (see [Agentic Workflows](#agentic-workflows--llm-integration) for async workflow details).

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

Generate images from text prompts or reference images using 20+ AI models (Flux, Google Imagen, OpenAI, Recraft, Ideogram, Stability, Qwen, ByteDance). Ideal for agentic content pipelines that need programmatic image creation.

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

Full `--additional` schemas: [`skills/simplified-cli/references/PLATFORM_GUIDE.md`](skills/simplified-cli/references/PLATFORM_GUIDE.md)

---

## Common Agentic Workflows

### Publish content to social media

```bash
# Workflow 1: Multi-platform social media scheduling
simplified accounts:list --network instagram   # note the "id" field
simplified posts:create -c "Your content" -a "INSTA_ID,LINKEDIN_ID" --action add_to_queue
```

### Process an image and post it

```bash
# Workflow 2: Agentic image pipeline (--wait output is pipeable)
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

## FAQ

**What is Simplified CLI used for?**
Simplified CLI is a command-line tool for social media automation — scheduling posts, pulling analytics, processing images, and generating AI images across 10 platforms including Instagram, TikTok, LinkedIn, YouTube, and Bluesky.

**Is Simplified CLI suitable for AI agents?**
Yes. All commands output JSON to stdout and return non-zero exit codes on failure, making it fully compatible with LLM tool use, agentic pipelines, and automation scripts.

**Which social media platforms are supported?**
Facebook, Instagram, LinkedIn, TikTok, TikTok Business, YouTube, Pinterest, Threads, Google Business, and Bluesky.

**Does it support AI image generation?**
Yes. The `ai-image:generate` command supports 20+ models including Flux, Google Imagen 4, OpenAI, Recraft, Ideogram, and Stability Diffusion.

**How is Simplified CLI different from Buffer or Hootsuite?**
Simplified CLI is developer-first and agentic-ready — JSON output, async task polling, AI image generation, and video tools are built in. It's designed to be used programmatically by scripts, CI/CD pipelines, and AI agents.

**Can I use it with Claude Code?**
Yes. Install it as a Claude Code plugin with `/plugin marketplace add celeryhq/simplified-cli` and manage social media directly from your AI coding assistant.

**Can I use it with OpenClaw?**
Yes. Since Simplified CLI is a standard shell tool with JSON output, any AI agent that can run shell commands — including [OpenClaw](https://openclaw.ai) — can use it directly. Just install globally with `npm install -g simplified-cli` and let your agent call `simplified` commands.

## Help

```bash
simplified --help
simplified <command> --help
```

Full documentation: [simplified.readme.io/reference/introduction](https://simplified.readme.io/reference/introduction)

## License

MIT
