# Video Tools Reference

AI-powered video processing. All operations are **asynchronous** — they return a `task_id`. AI generation commands (`script-to-video`, `text-to-video`) also support export status polling.

## Async pattern

```bash
# Option A: get task_id, poll manually
simplified video:convert --url "https://example.com/clip.avi" --format mp4
# → { "task_id": "abc123" }
simplified video:task --id abc123

# Option B: --wait flag (auto-polls every 2s, times out after 300s)
simplified video:convert --url "https://example.com/clip.avi" --format mp4 --wait
```

For AI-generated videos (`script-to-video`, `text-to-video`), the `--wait` flag also polls the export status after the task completes.

---

## Commands

### `video:add-b-rolls`

Add B-roll footage to a video.

```bash
simplified video:add-b-rolls \
  --title "My Product Demo" \
  --media-url "https://example.com/video.mp4" \
  --language-code en \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--title` | string | yes | Video title |
| `--media-url` | string | — | Source media URL |
| `--asset` | string | — | Asset identifier |
| `--language-code` | string | — | Language code (e.g. `en`) |
| `--should-export` | boolean | — | Export after processing |
| `--wait` | boolean | false | Block until done |

---

### `video:convert`

Convert a video to a different format.

```bash
simplified video:convert \
  --url "https://example.com/clip.avi" \
  --format mp4 \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--url` | string | — | Source video URL |
| `--format` | see below | `mp4` | Output format |
| `--wait` | boolean | false | Block until done |

**Supported formats:** `mp4`, `avi`, `mkv`, `mov`, `wmv`, `flv`, `webm`, `mpeg`, `mpg`, `3gp`, `ogv`, `ts`, `vob`, `m4v`, `f4v`, `rm`, `divx`, `asf`

---

### `video:merge`

Merge multiple videos into a single video.

```bash
simplified video:merge \
  --urls "https://example.com/intro.mp4,https://example.com/main.mp4,https://example.com/outro.mp4" \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--urls` | string | yes | Comma-separated video URLs (minimum 2) |
| `--wait` | boolean | false | Block until done |

---

### `video:remove-audio`

Remove the audio track from a video.

```bash
simplified video:remove-audio \
  --url "https://example.com/video.mp4" \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--url` | string | yes | Source video URL |
| `--wait` | boolean | false | Block until done |

---

### `video:reverse`

Reverse a video (play backwards).

```bash
simplified video:reverse \
  --url "https://example.com/video.mp4" \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--url` | string | yes | Source video URL |
| `--wait` | boolean | false | Block until done |

---

### `video:speedup`

Speed up or slow down a video.

```bash
simplified video:speedup \
  --url "https://example.com/video.mp4" \
  --playbackrate 2 \
  --wait
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--url` | string | yes | Source video URL |
| `--playbackrate` | number | yes | Playback rate (minimum `0.5`) |
| `--wait` | boolean | false | Block until done |

---

### `video:script-to-video`

Generate a complete video from a script using AI. Supports export polling for the final rendered video.

```bash
simplified video:script-to-video \
  --title "5 Tips for Better Sleep" \
  --tone educational \
  --format youtube-shorts \
  --language-code en \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--title` | string | — | Video title (required) |
| `--description` | string | — | Video description |
| `--keywords` | string | — | Keywords for content generation |
| `--tone` | see below | — | Video tone |
| `--creativity-level` | number | — | Creativity level |
| `--language-code` | string | — | Language code (e.g. `en`) |
| `--voice-id` | string | — | Voice ID for narration |
| `--format` | `youtube-shorts` \| `youtube-video` \| `instagram-post-video` \| `mp4` | — | Video format |
| `--no-runs` | number | — | Number of runs |
| `--logo-id` | string | — | Logo ID to overlay |
| `--caption-style-id` | string | — | Caption style ID |
| `--should-export` | boolean | `true` | Export after generation |
| `--wait` | boolean | false | Block until task and export complete |

**Tone options:** `professional`, `casual`, `humorous`, `inspirational`, `educational`, `dramatic`, `energetic`, `calm`, `friendly`, `authoritative`, `storytelling`, `persuasive`

---

### `video:text-to-video`

Generate a video from a text prompt using AI. Same options as `script-to-video`.

```bash
simplified video:text-to-video \
  --title "The Future of Renewable Energy" \
  --tone inspirational \
  --format youtube-video \
  --wait
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--title` | string | — | Video title (required) |
| `--description` | string | — | Video description |
| `--keywords` | string | — | Keywords for content generation |
| `--tone` | see tones above | — | Video tone |
| `--creativity-level` | number | — | Creativity level |
| `--language-code` | string | — | Language code (e.g. `en`) |
| `--voice-id` | string | — | Voice ID for narration |
| `--format` | `youtube-shorts` \| `youtube-video` \| `instagram-post-video` \| `mp4` | — | Video format |
| `--no-runs` | number | — | Number of runs |
| `--logo-id` | string | — | Logo ID to overlay |
| `--caption-style-id` | string | — | Caption style ID |
| `--should-export` | boolean | `true` | Export after generation |
| `--wait` | boolean | false | Block until task and export complete |

---

### `video:task`

Check the status of any async video processing task. Also shows progress info when available.

```bash
simplified video:task --id abc123
```

**Response fields:** `task_id`, `status`, `result`, `error` (+ progress info when available)

**Status values:** `pending` | `processing` | `completed` | `failed`
