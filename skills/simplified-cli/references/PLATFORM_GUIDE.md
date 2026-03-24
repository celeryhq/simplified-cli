# Platform Guide — `posts:create` Settings

Platform-specific options go in the `--additional` flag (JSON string) or in the `additional` key of a JSON file.

---

## Facebook

```json
"facebook": {
  "postType": { "value": "post" }
}
```

| Field | Values | Default |
|---|---|---|
| `postType.value` | `post` \| `reel` \| `story` | `post` |

---

## Instagram

```json
"instagram": {
  "postType": { "value": "post" },
  "channel": { "value": "direct" },
  "postReel": { "shareToFeed": true }
}
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `postType.value` | `post` \| `reel` \| `story` | `post` | **Required** |
| `channel.value` | `direct` \| `reminder` | `direct` | **Required** |
| `postReel.audioName` | string | — | Reel audio track name |
| `postReel.shareToFeed` | boolean | `true` | Share reel to main feed |

**Stories:** set `message` to empty string and pass exactly 1 photo in `media`.

---

## TikTok (Personal)

```json
"tiktok": {
  "postType": { "value": "video" },
  "channel": { "value": "direct" },
  "post": {
    "privacyStatus": "PUBLIC_TO_EVERYONE",
    "commentDisabled": false,
    "duetDisabled": false,
    "stitchDisabled": false
  }
}
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `postType.value` | `video` \| `photo` | `video` | **Required** |
| `channel.value` | `direct` \| `reminder` | `direct` | **Required** |
| `post.privacyStatus` | `PUBLIC_TO_EVERYONE` \| `MUTUAL_FOLLOW_FRIENDS` \| `FOLLOWER_OF_CREATOR` \| `SELF_ONLY` | `PUBLIC_TO_EVERYONE` | **Required** |
| `post.brandContent` | boolean | `false` | — |
| `post.brandOrganic` | boolean | `false` | — |
| `post.duetDisabled` | boolean | `true` | — |
| `post.stitchDisabled` | boolean | `true` | — |
| `post.commentDisabled` | boolean | `true` | — |

**Photo post:** use `postType: "photo"` and `postPhoto` instead of `post`:
```json
"postPhoto": { "title": "...", "privacyStatus": "PUBLIC_TO_EVERYONE", "autoAddMusic": false }
```

---

## TikTok Business

```json
"tiktokBusiness": {
  "postType": { "value": "video" },
  "post": {
    "privacyStatus": "PUBLIC_TO_EVERYONE",
    "aiGenerated": false,
    "uploadToDraft": false
  }
}
```

Same fields as TikTok Personal `post`, plus:

| Field | Values | Default |
|---|---|---|
| `post.aiGenerated` | boolean | `false` |
| `post.uploadToDraft` | boolean | `false` |

---

## YouTube

```json
"youtube": {
  "postType": { "value": "video" },
  "post": {
    "title": "My Video Title",
    "privacyStatus": "public",
    "license": "youtube",
    "selfDeclaredMadeForKids": "no"
  }
}
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `postType.value` | `video` \| `short` | `video` | **Required** |
| `post.title` | string | — | **Required** |
| `post.privacyStatus` | `public` \| `private` \| `unlisted` \| `""` | `""` | — |
| `post.license` | `youtube` \| `creativeCommon` \| `""` | `""` | — |
| `post.selfDeclaredMadeForKids` | `yes` \| `no` \| `""` | `""` | — |
| `post.publishAt` | string | — | Override publish datetime |

**Shorts:** set `postType.value` to `"short"`. Max 60 seconds, video files only.

---

## LinkedIn

```json
"linkedin": {
  "audience": { "value": "PUBLIC" }
}
```

| Field | Values | Default |
|---|---|---|
| `audience.value` | `PUBLIC` \| `CONNECTIONS` \| `LOGGED_IN` | `PUBLIC` |

---

## Pinterest

```json
"pinterest": {
  "post": {
    "title": "Pin Title",
    "link": "https://example.com",
    "imageAlt": "Alt text for image"
  }
}
```

**Always requires at least 1 image in `media`.**

---

## Threads

```json
"threads": {
  "channel": { "value": "direct" }
}
```

| Field | Values | Default |
|---|---|---|
| `channel.value` | `direct` \| `reminder` | `direct` |

---

## Google Business

```json
"google": {
  "post": {
    "topicType": "STANDARD",
    "callToActionType": "LEARN_MORE",
    "callToActionUrl": "https://example.com"
  }
}
```

| Field | Values | Default | Notes |
|---|---|---|---|
| `post.topicType` | `STANDARD` \| `EVENT` \| `OFFER` | `STANDARD` | — |
| `post.title` | string (max 58 chars) | — | For EVENT and OFFER |
| `post.callToActionType` | `BOOK` \| `ORDER` \| `SHOP` \| `LEARN_MORE` \| `SIGN_UP` \| `CALL` \| `""` | `""` | — |
| `post.callToActionUrl` | URL | — | — |
| `post.startDate` | string | — | For EVENT |
| `post.endDate` | string | — | For EVENT |
| `post.couponCode` | string | — | For OFFER |
| `post.redeemOnlineUrl` | URL | — | For OFFER |
| `post.termsConditions` | string | — | For OFFER |

**No video support.**

---

## Bluesky

No `additional` settings required.

---

## Multi-platform example

```bash
simplified posts:create --json campaign.json
```

```json
{
  "message": "New product launch! 🚀",
  "account_ids": ["111", "222", "333", "444"],
  "action": "schedule",
  "date": "2026-03-20 09:00",
  "media": ["https://example.com/launch.jpg"],
  "additional": {
    "instagram": {
      "postType": { "value": "post" },
      "channel": { "value": "direct" }
    },
    "facebook": {
      "postType": { "value": "post" }
    },
    "linkedin": {
      "audience": { "value": "PUBLIC" }
    },
    "bluesky": {}
  }
}
```
