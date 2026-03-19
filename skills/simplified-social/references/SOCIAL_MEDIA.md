# Social Media Reference

Commands for discovering connected accounts and publishing content.

---

## `accounts:list`

List all connected social media accounts.

```bash
# All accounts
simplified accounts:list

# Filter by platform
simplified accounts:list --network instagram
simplified accounts:list --network tiktok
```

**Valid networks:** `facebook` | `instagram` | `linkedin` | `tiktok` | `tiktokBusiness` | `youtube` | `pinterest` | `threads` | `google` | `bluesky`

**Response fields:** `id` (use this in posts/analytics), `name`, `type`

---

## `posts:create`

Create a post using CLI flags (simple) or a JSON file (complex / multi-platform).

### Actions

| Action | Description | Requires |
|---|---|---|
| `add_to_queue` | Auto-schedule via account queue | — |
| `schedule` | Post at specific datetime | `--date "YYYY-MM-DD HH:MM"` |
| `draft` | Save for later editing | — |

### Simple post

```bash
simplified posts:create \
  -c "Hello from simplified-cli!" \
  -a "123" \
  --action add_to_queue
```

### Scheduled post to multiple accounts

```bash
simplified posts:create \
  -c "Launching soon!" \
  -a "123,456" \
  --action schedule \
  --date "2026-03-20 09:00"
```

### Post with media

```bash
simplified posts:create \
  -c "Check this out" \
  -a "123" \
  --action add_to_queue \
  --media "https://example.com/image.jpg"
```

Multiple media (max 10, comma-separated):
```bash
  --media "https://example.com/img1.jpg,https://example.com/img2.jpg"
```

### Draft

```bash
simplified posts:create \
  -c "Work in progress..." \
  -a "123" \
  --action draft
```

### Complex post from JSON file

```bash
simplified posts:create --json campaign.json
```

JSON structure:
```json
{
  "message": "Announcing our new product!",
  "account_ids": ["111", "222", "333"],
  "action": "schedule",
  "date": "2026-03-20 09:00",
  "media": ["https://example.com/image.jpg"],
  "additional": {
    "instagram": { "postType": { "value": "post" }, "channel": { "value": "direct" } },
    "facebook": { "postType": { "value": "post" } },
    "linkedin": { "audience": { "value": "PUBLIC" } }
  }
}
```

### Platform-specific settings (`--additional`)

Pass a JSON string with per-platform options. See [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md) for all options.

```bash
# Instagram Reel
simplified posts:create -c "New reel!" -a "123" --action add_to_queue \
  --media "https://example.com/video.mp4" \
  --additional '{"instagram":{"postType":{"value":"reel"},"channel":{"value":"direct"}}}'

# YouTube Short
simplified posts:create -c "Description" -a "123" --action schedule \
  --date "2026-03-20 10:00" \
  --media "https://example.com/short.mp4" \
  --additional '{"youtube":{"postType":{"value":"short"},"post":{"title":"My Title"}}}'

# TikTok video
simplified posts:create -c "Caption" -a "123" --action add_to_queue \
  --media "https://example.com/video.mp4" \
  --additional '{"tiktok":{"postType":{"value":"video"},"channel":{"value":"direct"},"post":{"privacyStatus":"PUBLIC_TO_EVERYONE"}}}'

# LinkedIn (audience)
simplified posts:create -c "Professional update" -a "123" --action add_to_queue \
  --additional '{"linkedin":{"audience":{"value":"PUBLIC"}}}'
```

---

## `posts:list`

List scheduled/published posts for one or more accounts.

```bash
simplified posts:list --accounts "123"
simplified posts:list --accounts "123,456" --category scheduled --page 2 --per-page 20
simplified posts:list --accounts "123" --search "product launch" --tz "Europe/Warsaw"
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--accounts` / `-a` | *(required)* | Comma-separated account IDs |
| `--page` | `1` | Page number |
| `--per-page` | `10` | Posts per page |
| `--category` | `all` | Filter: `all` / `scheduled` / `published` / etc. |
| `--tz` | `UTC` | Timezone for date fields |
| `--search` | — | Text search |
| `--query` | — | Additional query filter |

---

## `posts:list-drafts`

List drafts for one or more accounts.

```bash
simplified posts:list-drafts --accounts "123"
simplified posts:list-drafts --accounts "123" --order-by "post.date" --order "-1"
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--accounts` / `-a` | *(required)* | Comma-separated account IDs |
| `--page` | `1` | Page number |
| `--per-page` | `10` | Drafts per page |
| `--search` | — | Text search |
| `--tz` | `UTC` | Timezone for date fields |
| `--order-by` | `post.date` | Sort field |
| `--order` | `-1` | `-1` = descending, `1` = ascending |

---

## `posts:delete`

Delete a scheduled post by group ID or post-schedule ID. At least one of the two flags is required.

```bash
simplified posts:delete --group-id "grp_abc123"
simplified posts:delete --post-schedule-id "ps_xyz789"
```

---

## `posts:delete-draft`

Delete one or more drafts by group ID or draft IDs. At least one of the two flags is required.

```bash
# Delete all drafts in a group
simplified posts:delete-draft --group-id "grp_abc123"

# Delete specific draft IDs (comma-separated)
simplified posts:delete-draft --draft-ids "d1,d2,d3"
```

---

## `posts:update`

Update a scheduled post. `--post-id` is required; provide any subset of the other fields to change.

```bash
# Change message only
simplified posts:update --post-id "ps_abc123" -c "Updated caption"

# Reschedule
simplified posts:update --post-id "ps_abc123" --date "2026-04-01" --time "10:00" --timezone "UTC"

# Replace media
simplified posts:update --post-id "ps_abc123" \
  --media "https://example.com/new-image.jpg"

# Clear media
simplified posts:update --post-id "ps_abc123" --media ""
```

**Options:**

| Flag | Description |
|---|---|
| `--post-id` | *(required)* Post ID to update |
| `--content` / `-c` | New post text |
| `--date` | New date `YYYY-MM-DD` |
| `--time` | New time `HH:MM` |
| `--timezone` | New timezone (e.g. `UTC`, `Europe/Warsaw`) |
| `--media` / `-m` | Comma-separated media URLs; pass empty string to clear |

---

## `posts:update-draft`

Update a draft. `--draft-id` is required; same optional fields as `posts:update`.

```bash
simplified posts:update-draft --draft-id "d_abc123" -c "Revised copy"
simplified posts:update-draft --draft-id "d_abc123" --date "2026-04-01" --time "09:00"
```

---

## Platform constraints

| Platform | Char limit | Notes |
|---|---|---|
| Bluesky | 300 | No `additional` required |
| LinkedIn | 3000 | Set `audience` (PUBLIC / CONNECTIONS / LOGGED_IN) |
| Instagram | 2200 | Requires `postType` + `channel`; stories: empty message + 1 photo |
| TikTok | 2200 | Requires `postType` + `channel` + `post` |
| YouTube | 2200 | Requires `postType` + `post.title` |
| Pinterest | 500 | Always requires at least 1 image |
| Google Business | 1500 | No video support |
| Facebook | 2200 | Optional `postType` (post / reel / story) |
| Threads | 500 | Optional `channel` (direct / reminder) |
