# Analytics Reference

Four commands covering different dimensions of social media performance.

---

## `analytics:aggregated`

Overall KPIs for a period. Best starting point for a performance overview.

```bash
simplified analytics:aggregated \
  -a 123 \
  --from 2026-03-01 \
  --to 2026-03-13
```

**Response — `baseLine` object:**

| Field | Description |
|---|---|
| `impressions_aggregated` | Total impressions |
| `engagement_aggregated` | Total engagement |
| `followers_aggregated` | Follower count / growth |
| `publishing_aggregated` | Number of posts published |

Each field contains `value` (current period) and `prevValue` (previous equivalent period for comparison).

---

## `analytics:range`

Time-series data — daily breakdown of selected metrics.

```bash
simplified analytics:range \
  -a 123 \
  --metrics "views,reach,follower_count" \
  --from 2026-03-01 \
  --to 2026-03-13

# With timezone
simplified analytics:range \
  -a 123 \
  --metrics "views,reach" \
  --from 2026-03-01 \
  --to 2026-03-13 \
  --tz "Europe/Warsaw"
```

**`--metrics`** accepts a comma-separated list. Unknown metrics are silently ignored by the API.

### Available metrics by platform

| Platform | Metrics |
|---|---|
| **Instagram** | `views`, `reach`, `follower_count`, `profile_views`, `website_clicks`, `email_contacts`, `text_message_clicks`, `accounts_engaged`, `profile_links_taps`, `saves`, `shares`, `replies`, `total_interactions`, `posts_count` |
| **Facebook** | `engaged_users`, `post_impression`, `post_impression_total`, `post_reach_total`, `post_impression_paid`, `post_reach_paid`, `post_reach`, `page_post_engagements`, `new_fan`, `reactions`, `total_fans`, `total_follows`, `link_clicks`, `video_play`, `other_clicks`, `photo_view`, `post_reach_viral`, `page_reach`, `posts_count` |
| **LinkedIn (Company)** | `impressions`, `unique_impressions`, `comments`, `likes`, `clicks`, `engagement`, `shares`, `allFollowers`, `organicFollowers`, `paidFollowers`, `posts_count` |
| **LinkedIn (Personal)** | `memberFollowers`, `impressions`, `comments`, `reactions`, `shares` |
| **Twitter / X** | `retweetCount`, `replyCount`, `likeCount`, `quoteCount`, `posts_count` |
| **YouTube** | `views`, `comments`, `likes`, `dislikes`, `estimatedMinutesWatched`, `averageViewDuration`, `posts_count` |
| **Pinterest** | `impression`, `engagement`, `engagement_rate`, `save`, `save_rate`, `pin_click`, `pin_click_rate`, `outbound_click`, `outbound_click_rate`, `video_mrc_view`, `video_avg_watch_time`, `video_v50_watch_time`, `video_start`, `video_10s_view`, `quartile_95_percent_view`, `posts_count` |
| **TikTok (Personal)** | `follower_count`, `likes_count`, `posts_count` |
| **TikTok Business** | `video_views`, `followers_count`, `comments`, `shares`, `profile_views`, `audience_genders`, `audience_countries`, `audience_activity`, `posts_count` |
| **Threads** | `views`, `followers_count`, `likes`, `replies`, `reposts`, `quotes`, `clicks`, `posts_count` |
| **Google Business** | `queries_direct`, `queries_indirect`, `queries_chain`, `views_maps`, `views_search`, `actions_website`, `actions_phone`, `actions_driving_directions`, `business_impressions_desktop_maps`, `business_impressions_mobile_maps`, `business_impressions_mobile_search`, `business_impressions_desktop_search`, `posts_count` |

---

## `analytics:posts`

Per-post performance metrics. Supports pagination.

```bash
simplified analytics:posts \
  -a 123 \
  --from 2026-03-01 \
  --to 2026-03-13

# Paginate
simplified analytics:posts \
  -a 123 \
  --from 2026-03-01 \
  --to 2026-03-13 \
  --page 2 \
  --per-page 25
```

**Options:** `--page` (default: 1), `--per-page` (default: 10, max: 100)

**Response fields per post:** `id`, `message`, `publishedDate`, `postUrl`, `postType`, `media[]`, `metrics{}`

Use `all_posts_count` and `pages_count` from the response to paginate through all results.

---

## `analytics:audience`

Audience demographics — follower breakdown by geography and gender/age.

```bash
simplified analytics:audience \
  -a 123 \
  --from 2026-03-01 \
  --to 2026-03-13

# With timezone
simplified analytics:audience \
  -a 123 \
  --from 2026-03-01 \
  --to 2026-03-13 \
  --tz "America/New_York"
```

**Response fields:** `audience_page_fans_gender_age`, `audience_page_fans_country`, `audience_page_fans_city`

---

## Date rules

- `date_to` must **never** be in the future — analytics only covers past data.
- When user says "this month" → set `date_to` to today's date.
- When user says "last 7 days" → `date_from` = today minus 7, `date_to` = today.
- Use `--tz` when the user mentions a specific timezone or city, otherwise default to UTC.
