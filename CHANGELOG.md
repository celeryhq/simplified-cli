# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] — 2026-06-03

### Added

#### Multi-teamspace context

A single API key can now operate against multiple teamspaces (Spaces) within its workspace via a
switchable, persisted context — no need for a separate token per teamspace. The active teamspace is
sent to the API as the numeric `Space` header; with no context set, requests are byte-for-byte
identical to before (token's default workspace), so the change is fully backward compatible.

- **`auth:whoami`** — report what the current token can access: its default workspace and the
  teamspaces (Spaces) the token's user is a member of, via `GET /api/v1/service/workspaces`
- **`teamspace:current`** — show the active teamspace and its source (flag / env / config / default)
- **`teamspace:use <id|alias>`** — set the persisted active teamspace; `teamspace:use default` clears it
- **`teamspace:add <alias> <id>`** — save an `alias → numeric id` mapping
- **`teamspace:list`** — list saved aliases and mark the active one
- **`teamspace:remove <alias>`** — remove a saved alias
- **Global `--teamspace <id|alias>` flag** — one-off scope for any command (highest precedence)
- **`SIMPLIFIED_TEAMSPACE_ID`** env var — session-level override

Resolution precedence (highest first): `--teamspace` flag → `SIMPLIFIED_TEAMSPACE_ID` env →
saved context (`~/.simplified/config.json`) → default workspace. Errors are actionable: a teamspace
the token can't access fails with `403`, a non-numeric id with `400`.

> **Note:** one API key is bound to one workspace at issuance. Teamspace switching works *within*
> that workspace; operating across workspaces still requires a separate key per workspace.

#### Documentation

- Updated `skills/simplified-cli/SKILL.md` with the teamspace context section, agent pattern, and critical rule
- Updated `README.md` with the teamspace context guide

---

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
