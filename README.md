# simplified-cli

Command-line tool for [Simplified.com](https://simplified.com) — manage social media accounts, schedule posts, analyze performance, and process images with AI.

## Installation

```bash
npm install -g simplified-cli
```

## Setup

Get your API key from **Simplified.com → Settings → API Keys**, then export it:

```bash
export SIMPLIFIED_API_KEY=your_api_key_here
```

## Commands

### Accounts

```bash
# List all connected accounts
simplified accounts:list

# Filter by platform
simplified accounts:list --network instagram
```

**Supported platforms:** `facebook` · `instagram` · `linkedin` · `tiktok` · `tiktokBusiness` · `youtube` · `pinterest` · `threads` · `google` · `bluesky`

---

### Posts

```bash
# Queue a post
simplified posts:create -c "Hello world!" -a "ACCOUNT_ID" --action add_to_queue

# Schedule a post
simplified posts:create -c "Launching soon!" -a "ACCOUNT_ID" --action schedule --date "2026-04-01 09:00"

# Save as draft
simplified posts:create -c "Work in progress" -a "ACCOUNT_ID" --action draft

# Post with media
simplified posts:create -c "Check this out" -a "ACCOUNT_ID" --action add_to_queue \
  --media "https://example.com/image.jpg"

# Complex post from JSON file (multi-platform, platform-specific settings)
simplified posts:create --json post.json
```

**Actions:** `add_to_queue` · `schedule` (requires `--date "YYYY-MM-DD HH:MM"`) · `draft`

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

> **Note:** `--to` must never be a future date — analytics only covers past data.

---

### Image Tools

All image commands accept `--url` with a public image URL. Async commands return a `task_id` — use `--wait` to block until the result is ready.

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

## Common workflows

### Publish content to social media

```bash
# 1. Find your account IDs
simplified accounts:list

# 2. Publish
simplified posts:create -c "Your content" -a "ACCOUNT_ID" --action add_to_queue
```

### Process an image and post it

```bash
# 1. Remove background and wait for result
simplified image:remove-background --url "https://example.com/photo.jpg" --wait

# 2. Post with the returned URL
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
