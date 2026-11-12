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

**Valid networks:** `facebook` | `instagram` | `linkedin` | `tiktok` | `tiktokBusiness` | `youtube` | `pinterest` | `threads` | `google` | `bluesky` | `mastodon` | `reddit` | `telegram`

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

### Timezone (`--timezone`)

`--date` is a wall-clock time (`YYYY-MM-DD HH:MM`). The API reads it in `--timezone` (an IANA zone).
Without the flag it reads it in the **workspace** timezone. The CLI sends the date unchanged, so
do not convert it to UTC yourself. An unknown zone returns `400 {"timezone": ["Unknown timezone '...'"]}`.
The API ignores the flag for `add_to_queue`.

```bash
# 9:00 AM Pacific, whatever the workspace timezone is
simplified posts:create -c "Hello" -a "123" --action schedule \
  --date "2026-11-12 09:00" --timezone "America/Los_Angeles"
```

**Read-back:** `posts:list` returns each post's `date` and `time` together with its `timezone`,
as scheduled. The post above comes back as `"date": "2026-11-12", "time": "09:00",
"timezone": "America/Los_Angeles"`, so compare those fields directly and don't convert anything.

### Grouped multi-platform post (`--group`)

By default, posting to multiple accounts creates a *separate* post per account. Add `--group` to
group 2+ accounts under a single `groupId` instead — one card for the approver, like the web UI.
The same `message` applies to all accounts (per-platform captions are not supported).

```bash
simplified posts:create \
  -c "Launch day across all channels!" \
  -a "123,456,789" \
  --action draft \
  --group
```

`--group` also works with `--json` (it sets `group: true` on the payload), and you can equivalently
add `"group": true` directly inside the JSON file — see the JSON example below.

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

Media with per-item thumbnails (e.g. a video poster). `--media-json` takes a JSON array whose
items are either a URL string or a `{ "url", "thumbUrl" }` object, and wins over `--media` when
both are passed:
```bash
simplified posts:create -c "New reel" -a "act_123" --action add_to_queue \
  --media-json '[{"url":"https://example.com/v.mp4","thumbUrl":"https://example.com/poster.jpg"}]'
```

### Draft

```bash
simplified posts:create \
  -c "Work in progress..." \
  -a "123" \
  --action draft
```

### Auto-comments (first comment)

Add comments that are posted automatically after the post publishes — handy for the common
"link in first comment" pattern. Comments are processed in array order; `delay` is the number of
seconds to wait after publishing (default `0`).

Single first comment with `--comment`:
```bash
simplified posts:create \
  -c "Our new launch!" \
  -a "123" \
  --action add_to_queue \
  --comment "Link in first comment 👇 https://example.com"
```

Multiple comments with delays via `--comments` (JSON array; wins over `--comment`):
```bash
simplified posts:create \
  -c "Big news!" \
  -a "123" \
  --action add_to_queue \
  --comments '[{"message":"Thanks for reading! 🙌","delay":0},{"message":"Follow for more.","delay":120}]'
```

In a `--json` file, use the `comments` field (see the JSON example below).

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
  "timezone": "America/Los_Angeles",
  "media": ["https://example.com/image.jpg"],
  "comments": [
    { "message": "Link in first comment 👇", "delay": 0 },
    { "message": "Follow for more updates.", "delay": 120 }
  ],
  "group": true,
  "additional": {
    "instagram": { "postType": { "value": "post" }, "channel": { "value": "direct" } },
    "facebook": { "postType": { "value": "post" } },
    "linkedin": { "audience": { "value": "PUBLIC" } }
  }
}
```

`"timezone"` is optional (default: workspace timezone). `--timezone` on the command line overrides it.

`"group": true` is optional — include it (or pass `--group`) to group 2+ accounts under one
`groupId`; omit it for a separate post per account.

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
| `--media-json` | JSON array of URL strings and/or `{url, thumbUrl}` objects; wins over `--media` |

---

## `posts:update-draft`

Update a draft. `--draft-id` is required; same optional fields as `posts:update`.
`--date`, `--time` and `--timezone` must be given **together**. The CLI rejects a partial set.
If the API rejects the update (HTTP 200 with `status` other than `1`), the CLI prints the message and
exits 1, so check the exit code before running `posts:schedule-draft`.

```bash
simplified posts:update-draft --draft-id "d_abc123" -c "Revised copy"
simplified posts:update-draft --draft-id "d_abc123" --date "2026-04-01" --time "09:00" --timezone "America/Los_Angeles"
```

---

## `posts:schedule-draft`

Schedule existing drafts as posts. Each draft becomes a new post, either at the date/time stored on the
draft (`schedule`) or at the account's next free queue slot (`add_to_queue`).

```bash
simplified posts:schedule-draft --draft-ids "456" --action schedule --tz "America/Los_Angeles"
simplified posts:schedule-draft --draft-ids "456,789" --action add_to_queue
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--draft-ids` | *(required)* | Comma-separated draft IDs. Each draft must be linked to an account |
| `--action` | *(required)* | `schedule` or `add_to_queue` |
| `--tz` | user's **planner** timezone | IANA zone the draft's stored date/time is read in |

> ⚠️ The default `--tz` is the user's planner timezone, **not** the workspace timezone that
> `posts:create` uses. Always pass `--tz` explicitly.

**Output:** the new **post** IDs (these differ from the draft IDs; use them with `posts:update` /
`posts:delete`), then each entry from `errors`. The command exits non-zero when no post was created.

**Errors:** a draft that is already scheduled or does not exist is reported as an error (`400` with
`detail`) and never scheduled twice. A draft without an account cannot be scheduled.

### Draft → schedule at an exact local time

```bash
# 1) create the draft (linked to an account)
simplified posts:create -a "123" --action draft -c "..."
# 2) set the real time in the intended zone (date, time and timezone together)
simplified posts:update-draft --draft-id "456" --date "2026-11-12" --time "09:00" --timezone "America/Los_Angeles"
# 3) schedule it in the same zone
simplified posts:schedule-draft --draft-ids "456" --action schedule --tz "America/Los_Angeles"
# 4) read back: the post shows "time": "09:00" with "timezone": "America/Los_Angeles"
simplified posts:list --accounts "123" --category scheduled
```

---

## `review-bundle:create`

Group social media drafts into a shareable **review bundle** so collaborators or clients can approve content before it is scheduled or published. The response includes a `linkToReview` (alias `reviewUrl`) you can share with reviewers. Draft IDs come from `posts:list-drafts`.

```bash
# Empty bundle (add drafts later)
simplified review-bundle:create -t "Q2 social drafts"

# Seed with drafts on creation
simplified review-bundle:create \
  -t "April campaign — round 1" \
  --description "Please review captions before scheduling." \
  --draft-ids "draft-1,draft-2"
```

**Options:**

| Flag | Description |
|---|---|
| `--title` / `-t` | *(required)* Bundle title (max 255 chars) |
| `--description` | Optional description shown to reviewers |
| `--draft-ids` | Comma-separated draft IDs to seed the bundle with (optional) |

**Response fields:** `id` (alias `packageId`), `title`, `description`, `drafts` (IDs in the bundle), `reviewUrl` / `linkToReview`.

---

## `review-bundle:add-drafts`

Append drafts to an existing review bundle without recreating it. Idempotent — a draft already in the bundle is silently skipped, not duplicated. Returns the updated bundle.

```bash
simplified review-bundle:add-drafts \
  --bundle-id "abc123" \
  --draft-ids "draft-3,draft-4"
```

**Options:**

| Flag | Description |
|---|---|
| `--bundle-id` | *(required)* ID of the existing review bundle |
| `--draft-ids` | *(required)* Comma-separated draft IDs to add (at least one) |

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
| Mastodon | 500 | No `additional` required |
| Reddit | — | Requires `additional.reddit.post.targets` with ≥1 entry (`subreddit` + `title` + `type`) — see [PLATFORM_GUIDE.md](PLATFORM_GUIDE.md#reddit) |
| Telegram | 4096 | No `additional` required |
