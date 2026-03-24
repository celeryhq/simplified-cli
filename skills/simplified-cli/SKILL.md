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

## Available Domains

| Domain | Commands | Reference |
|---|---|---|
| **Social Media** | `accounts:list`, `posts:create`, `posts:list`, `posts:list-drafts`, `posts:delete`, `posts:delete-draft`, `posts:update`, `posts:update-draft` | [SOCIAL_MEDIA.md](references/SOCIAL_MEDIA.md) |
| **Analytics** | `analytics:range`, `analytics:posts`, `analytics:aggregated`, `analytics:audience` | [ANALYTICS.md](references/ANALYTICS.md) |
| **Image Tools** | `image:blur-background`, `image:remove-background`, `image:convert`, `image:upscale`, `image:restore`, `image:generative-fill`, `image:outpaint`, `image:magic-inpaint`, `image:pix-to-pix`, `image:replace`, `image:sd-scribble` | [IMAGE_TOOLS.md](references/IMAGE_TOOLS.md) |
| **Video Tools** | `video:add-b-rolls`, `video:convert`, `video:merge`, `video:remove-audio`, `video:reverse`, `video:script-to-video`, `video:text-to-video`, `video:speedup`, `video:task` | [VIDEO_TOOLS.md](references/VIDEO_TOOLS.md) |
| **AI Image Generation** | `ai-image:generate`, `ai-image:status`, `ai-image:models` | [AI_IMAGE.md](references/AI_IMAGE.md) |

---

## Agent Patterns

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

- **Analytics `date_to` must never be in the future.** Cap at today when user says "this month" or "last 7 days".
- **Async image commands** return a `task_id`. Use `--wait` to block until done, or `image:task --id <id>` to poll manually.
- **Async video commands** return a `task_id`. Use `--wait` to block until done (timeout 300s), or `video:task --id <id>` to poll manually. AI generation commands (`script-to-video`, `text-to-video`) also poll export status when using `--wait`.
- **AI image generation** is async — returns `art_variation_id`. Use `--wait` to block until done (timeout 180s), or `ai-image:status --id <art_variation_id>` to poll manually. When done, outputs an array of `{ asset_id, url }`.
- **AI image models** — use `ai-image:models` to discover available models, capabilities, supported parameters, and credits per image before generating.
- **Platform-specific settings** for posts (reels, stories, TikTok privacy, YouTube title, etc.) go in `--additional` JSON — see [PLATFORM_GUIDE.md](references/PLATFORM_GUIDE.md).
