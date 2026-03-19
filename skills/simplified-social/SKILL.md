# simplified-cli Skill

Command-line tool for Simplified.com — manage social media accounts, schedule posts, analyze performance, and process images with AI.

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
- **Platform-specific settings** for posts (reels, stories, TikTok privacy, YouTube title, etc.) go in `--additional` JSON — see [PLATFORM_GUIDE.md](references/PLATFORM_GUIDE.md).
