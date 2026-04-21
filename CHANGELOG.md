# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] — 2026-04-21

### Added

#### Asset Management (`assets:*`)

New command group for uploading and managing workspace assets.

- **`assets:import`** — Import a remote file (S3, GCP, CDN URL) as a workspace asset. Backend downloads and processes the file asynchronously. Options: `--url` (required), `--name`
- **`assets:upload`** — Upload a local file as a workspace asset via signed S3/GCP URL. Supports images (PNG, JPG, GIF, WebP, BMP, TIFF), video (MP4, MOV, AVI, MKV, WebM), audio (MP3, WAV) and PDF. Options: `--file` (required), `--name`
- **`assets:get`** — Fetch asset details by UUID. Useful for checking processing status and retrieving the final stored URL after import or upload. Options: `--id` (required)

---

## [1.1.0] — 2026-03-24

### Added

#### AI Image Generation (`ai-image:*`)

New command group for generating images using state-of-the-art AI models via the Simplified AI Image API.

- **`ai-image:generate`** — Generate images from a text prompt or reference image. Supports:
  - `--model` — choose from 20+ models (Flux, Google Imagen, OpenAI, Recraft, Ideogram, Stability, Qwen, ByteDance)
  - `--capability` — `prompt` (text-to-image), `reference_image`, `multiple_images`
  - `--prompt`, `--aspect-ratio`, `--count` (1–4), `--negative-prompt`, `--seed`
  - `--reference-images` — comma-separated asset UUIDs for reference-based generation
  - `--properties` — comma-separated style slugs (e.g. `cinematic,photography`)
  - `--wait` — polls until generation completes and prints `[{ asset_id, url }]`
- **`ai-image:status`** — Check the status of a generation task by `art_variation_id`
- **`ai-image:models`** — List available models with capabilities, estimated generation time, credits per image, and full field definitions. Filterable by `--model-id` and `--capability`. Does not require authentication.

#### Polling

- Added `pollAiImageStatus()` in `polling.ts` — dedicated polling for AI image generation using the `/ai-image/status/{art_variation_id}` endpoint with 3s interval and 180s timeout

#### Documentation

- Updated `skills/simplified-cli/SKILL.md` with AI image agent patterns and critical rules
- Added `skills/simplified-cli/references/AI_IMAGE.md` — full command reference with examples

---

## [1.0.0] — 2026-03-20

Initial public release.

### Added

- `accounts:list` — list connected social media accounts
- `posts:create`, `posts:list`, `posts:list-drafts`, `posts:delete`, `posts:delete-draft`, `posts:update`, `posts:update-draft`
- `analytics:range`, `analytics:posts`, `analytics:aggregated`, `analytics:audience`
- `image:blur-background`, `image:remove-background`, `image:convert`, `image:upscale`, `image:restore`, `image:generative-fill`, `image:outpaint`, `image:magic-inpaint`, `image:pix-to-pix`, `image:replace`, `image:sd-scribble`, `image:task`
- `video:add-b-rolls`, `video:convert`, `video:merge`, `video:remove-audio`, `video:reverse`, `video:script-to-video`, `video:text-to-video`, `video:speedup`, `video:task`
