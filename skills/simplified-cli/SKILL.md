---
name: simplified-cli
description: Manage social media accounts, schedule posts, analyze performance, process images and videos, generate AI images, and switch teamspace context using the Simplified CLI. Use when the user wants to publish to social media, analyze performance, process images, generate AI images, work with video, or scope commands to a specific teamspace.
---

# simplified-cli Skill

Command-line tool for Simplified.com — manage social media accounts, schedule posts, analyze performance, process images and videos with AI.

## Setup

```bash
export SIMPLIFIED_API_KEY=your_api_key_here
```

Get your API key: **Simplified.com → Settings → API Keys**

Install globally:
```bash
npm install -g simplified-cli
```

---

## Teamspace context

A token operates in one **workspace** but may belong to several **teamspaces** (Spaces) within
it. Every command can be scoped to a teamspace; with no teamspace set, commands use the token's
default workspace (unchanged behaviour). The active teamspace is sent to the API as the numeric
`Space` header.

```bash
# Discover what the token can access (default workspace + member teamspaces)
simplified auth:whoami

# One-off scope for a single command (highest precedence, nothing persisted)
simplified accounts:list --teamspace 1911

# Persisted context (saved to ~/.simplified/config.json)
simplified teamspace:add store 1911     # alias -> numeric id
simplified teamspace:use store          # set active teamspace
simplified teamspace:current            # show active context + its source
simplified teamspace:use default        # back to default workspace
```

Resolution precedence (highest first): `--teamspace` flag → `SIMPLIFIED_TEAMSPACE_ID` env →
saved context → default workspace.

**Agent rule:** when the user names a teamspace, resolve its numeric id with `auth:whoami`
first, then either pass `--teamspace <id>` per command or set it once with `teamspace:use`.
A key scoped to a single space returns `403` for other teamspaces; an "all spaces" key reaches
every teamspace it can access — prefer one of those to work across teamspaces with a single key.
Create one in Settings → API Keys with **Space** set to "Workspace-wide (all spaces)" (single-space
keys can't be upgraded in place).

## API key profiles

The API key is read from (highest first): `--api-key` flag → active stored profile →
`SIMPLIFIED_API_KEY` env. Store keys in the CLI so you don't re-paste tokens or edit env vars:

```bash
simplified auth:login work        # paste the key (hidden prompt); becomes the active key
simplified auth:use work          # switch the active profile
simplified auth:list              # list profiles (masked), * = active
simplified auth:logout [name]     # remove a profile (defaults to active)
simplified auth:whoami            # show active key id + source, plus accessible teamspaces
```

The stored profile **wins over `SIMPLIFIED_API_KEY`** (a warning prints when env is ignored), so a
stale env key can't silently shadow the one you logged in with. Keys are stored `0600` in
`~/.simplified/config.json`. For CI, set `SIMPLIFIED_API_KEY` or pass `--api-key`.

---

## Available Domains

| Domain | Commands | Reference |
|---|---|---|
| **Auth** | `auth:login`, `auth:use`, `auth:list`, `auth:logout`, `auth:whoami` (global `--api-key`) | (this file — "API key profiles") |
| **Context** | `teamspace:current`, `teamspace:use`, `teamspace:add`, `teamspace:list`, `teamspace:remove` | (this file — "Teamspace context") |
| **Social Media** | `accounts:list`, `posts:create`, `posts:list`, `posts:list-drafts`, `posts:delete`, `posts:delete-draft`, `posts:update`, `posts:update-draft` | [SOCIAL_MEDIA.md](references/SOCIAL_MEDIA.md) |
| **Analytics** | `analytics:range`, `analytics:posts`, `analytics:aggregated`, `analytics:audience` | [ANALYTICS.md](references/ANALYTICS.md) |
| **Image Tools** | `image:blur-background`, `image:remove-background`, `image:convert`, `image:upscale`, `image:restore`, `image:generative-fill`, `image:outpaint`, `image:magic-inpaint`, `image:pix-to-pix`, `image:replace`, `image:sd-scribble` | [IMAGE_TOOLS.md](references/IMAGE_TOOLS.md) |
| **Video Tools** | `video:add-b-rolls`, `video:convert`, `video:merge`, `video:remove-audio`, `video:reverse`, `video:script-to-video`, `video:text-to-video`, `video:speedup`, `video:task` | [VIDEO_TOOLS.md](references/VIDEO_TOOLS.md) |
| **AI Image Generation** | `ai-image:generate`, `ai-image:status`, `ai-image:models` | [AI_IMAGE.md](references/AI_IMAGE.md) |
| **Brand Kits & Brand Context** | `brandkit:list`, `brandkit:create`, `brandkit:get`, `brandkit:brandbook`, `brandkit:build`, `brandkit:import`, `brandkit:context-list`, `brandkit:context-create`, `brandkit:context-update`, `brandkit:context-delete`, `brandkit:context-get` | [BRAND_KIT.md](references/BRAND_KIT.md) |
| **Projects & Items** | `projects:list`, `projects:create`, `projects:get`, `projects:delete`, `projects:export`, `projects:item-list`, `projects:item-create`, `projects:item-get`, `projects:item-delete`, `projects:item-assign-agent`, `projects:item-reorder` | [PROJECTS.md](references/PROJECTS.md) |

---

## Agent Patterns

### Work inside a specific teamspace
```bash
# 1. Find the teamspace id
simplified auth:whoami

# 2. Account IDs are scoped to the teamspace — list within it
simplified accounts:list --teamspace <teamspace_id>

# 3. Create/draft in that teamspace (asset, draft and post all land in it)
simplified posts:create -c "Your content" -a "<account_id>" --action draft \
  --teamspace <teamspace_id>
```

### Post to social media
```bash
# 1. Discover account IDs
simplified accounts:list --network instagram

# 2. Publish
simplified posts:create -c "Your content" -a "<account_id>" --action add_to_queue
```

### Review and manage scheduled posts
```bash
# List upcoming posts
simplified posts:list --accounts "<account_id>" --category scheduled

# Update a post message
simplified posts:update --post-id "<post_id>" -c "Revised caption"

# Cancel / delete a post
simplified posts:delete --post-schedule-id "<post_id>"
```

### Work with drafts
```bash
# List drafts
simplified posts:list-drafts --accounts "<account_id>"

# Edit a draft
simplified posts:update-draft --draft-id "<draft_id>" -c "Polished copy"

# Delete drafts
simplified posts:delete-draft --draft-ids "<id1>,<id2>"
```

### Process image then post
```bash
# 1. Remove background (async, wait for result)
simplified image:remove-background --url "https://example.com/photo.jpg" --wait

# 2. Use returned URL in post
simplified posts:create -c "Caption" -a "<account_id>" --action add_to_queue \
  --media "<result_url_from_step_1>"
```

### Generate AI video then post
```bash
# 1. Generate a video from a script (wait for export)
simplified video:script-to-video \
  --title "5 Tips for Better Sleep" \
  --tone educational \
  --format youtube-shorts \
  --wait

# 2. Use returned URL in post
simplified posts:create -c "Watch our latest video!" -a "<account_id>" --action add_to_queue \
  --media "<result_url_from_step_1>"
```

### Generate AI video (V2 models: Veo, Sora, Kling) then post
```bash
# 1. Discover models and capabilities
simplified ai-video:models

# 2. Generate a video and wait (storage=asset persists a reusable asset)
simplified ai-video:generate \
  --model veo-3-fast \
  --prompt "Drone shot over a neon city at night, cinematic" \
  --aspect-ratio 16:9 --resolution 1080p --duration 8 \
  --storage asset --wait

# 3. Use the returned file_url in a post
simplified posts:create -c "Our latest reel!" -a "<account_id>" --action add_to_queue \
  --media "<file_url_from_step_2>"

# Check status manually (needs BOTH ids returned by generate)
simplified ai-video:status --art-id "<id>" --id "<art_variation_id>"
```
See [AI_VIDEO.md](references/AI_VIDEO.md) for the full option list. Distinct from
the legacy `video:script-to-video` (AI narrated/presenter video) above.

### Process video (convert, merge, speedup)
```bash
# Convert format
simplified video:convert --url "https://example.com/clip.avi" --format mp4 --wait

# Merge multiple clips
simplified video:merge --urls "https://example.com/intro.mp4,https://example.com/main.mp4" --wait

# Speed up a video
simplified video:speedup --url "https://example.com/video.mp4" --playbackrate 2 --wait
```

### Generate AI image then post
```bash
# 1. Discover available models
simplified ai-image:models --capability prompt

# 2. Generate an image and wait for result
simplified ai-image:generate \
  --model flux.flux-realism \
  --prompt "A stunning sunset over mountains, photorealistic, 8k" \
  --aspect-ratio 16:9 \
  --count 2 \
  --wait

# 3. Use returned URL in a post
simplified posts:create -c "Beautiful scenery" -a "<account_id>" --action add_to_queue \
  --media "<url_from_step_2>"
```

### Generate AI image from a reference image
```bash
# Style transfer using reference image asset UUID
simplified ai-image:generate \
  --model flux.flux-kontext-pro \
  --capability reference_image \
  --prompt "Transform to watercolor painting style" \
  --reference-images "<asset-uuid>" \
  --wait
```

### Check AI image generation status manually
```bash
simplified ai-image:status --id "<art_variation_id>"
```

### Campaign performance review
```bash
# Quick overview
simplified analytics:aggregated -a 123 --from 2026-03-01 --to 2026-03-13

# Top posts
simplified analytics:posts -a 123 --from 2026-03-01 --to 2026-03-13 --per-page 5

# Audience demographics
simplified analytics:audience -a 123 --from 2026-03-01 --to 2026-03-13
```

---

## Critical Rules

- **Teamspace scoping.** Use `auth:whoami` to resolve teamspace ids; pass `--teamspace <id>` (or set `teamspace:use`) to scope a command. A single "all spaces" key can reach every teamspace it has access to; a key scoped to one space fails with `403` on the others. A non-numeric id fails with `400`.
- **Analytics `date_to` must never be in the future.** Cap at today when user says "this month" or "last 7 days".
- **Async image commands** return a `task_id`. Use `--wait` to block until done, or `image:task --id <id>` to poll manually.
- **Async video commands** return a `task_id`. Use `--wait` to block until done (timeout 300s), or `video:task --id <id>` to poll manually. AI generation commands (`script-to-video`, `text-to-video`) also poll export status when using `--wait`.
- **AI image generation** is async — returns `art_variation_id`. Use `--wait` to block until done (timeout 180s), or `ai-image:status --id <art_variation_id>` to poll manually. When done, outputs an array of `{ asset_id, url }`.
- **AI image models** — use `ai-image:models` to discover available models, capabilities, supported parameters, and credits per image before generating.
- **AI video generation (V2)** is async — `ai-video:generate` returns `id` (art) and `art_variation_id` (variation). Use `--wait` to block until done (30s poll, 600s timeout), or `ai-video:status --art-id <id> --id <art_variation_id>` to poll manually (it needs BOTH ids). When done, the `output` holds `file_url` and the asset `id`.
- **AI video models** — run `ai-video:models` first: model ids (`veo-3`, `sora-2`, `kling-*`, …), capabilities, and valid durations/resolutions/aspect ratios are model-specific. File-typed fields take asset UUIDs, not raw URLs.
- **Platform-specific settings** for posts (reels, stories, TikTok privacy, YouTube title, etc.) go in `--additional` JSON — see [PLATFORM_GUIDE.md](references/PLATFORM_GUIDE.md).
