# Changelog

All notable changes to this project will be documented in this file.

## [1.4.1] — 2026-06-10

### Fixed

- **`posts:create --group` now works on the `--json` (`-j`) path.** Previously `--group` was
  silently ignored when the payload came from a JSON file, producing separate ungrouped drafts.
  The flag is now honored on both paths, and a `"group": true` field inside the JSON file is
  honored on its own as well.

### Changed

- **`auth:whoami`** now points to creating a **Workspace-wide (all spaces)** API key (Settings →
  API Keys) for cross-teamspace access, instead of suggesting a separate key per workspace.

---

## [1.4.0] — 2026-06-09

### Added

- **Brand Kits**: `brandkit:list`, `brandkit:create`, `brandkit:get`, `brandkit:brandbook`, `brandkit:build`, `brandkit:import`.
- **Brand Context Documents**: `brandkit:context-list`, `brandkit:context-create`, `brandkit:context-update`, `brandkit:context-delete`, `brandkit:context-get`.
- **Projects & Items**: `projects:list`, `projects:create`, `projects:get`, `projects:delete`, `projects:export`, and `projects:item-{list,create,get,delete,assign-agent,reorder}`.
- Test runner (`vitest`) with unit coverage for the input helpers and `request()` 204 handling.

---

## [1.3.1] — 2026-06-09

### Fixed

- **`posts:list-drafts` / `posts:list` with multiple accounts now return results.** Multi-value
  `account_ids` were sent as a single comma-joined query param (`account_ids=1,2`), which the API
  treated as one unknown id and returned an empty list. They are now sent as repeated params
  (`account_ids=1&account_ids=2`) as the API expects. Single-account calls are unaffected.

### Added

- **`posts:create --group`** — when creating a post for 2+ accounts, `--group` sends `group: true`
  so the API groups them under a single `groupId` (one card in the approver view) instead of
  creating separate ungrouped posts per account. Without the flag, behavior is unchanged.

#### API key profiles (`auth:login`)

Store multiple named API keys in the CLI and switch between them, mirroring the `teamspace:*` model —
no more hand-editing `SIMPLIFIED_API_KEY` in your shell to swap client workspaces.

- **`auth:login <name>`** — save an API key under a profile name and make it active. Prompts for the
  key with hidden input; `--api-key <key>` (or piping the key on stdin) works non-interactively for CI.
- **`auth:use <name>`** — switch the active profile.
- **`auth:list`** — list saved profiles with masked keys, marking the active one.
- **`auth:logout [name]`** — remove a profile (defaults to the active one).
- **Global `--api-key <key>` flag** — one-off key override for any command.

Key resolution precedence (highest first): `--api-key` flag → active profile → `SIMPLIFIED_API_KEY`
env. The **stored profile wins over the env var**, so a stale `SIMPLIFIED_API_KEY` in your shell can
no longer silently shadow the key you logged in with; when env is set but ignored, a warning shows
both masked keys. Keys are stored in `~/.simplified/config.json` with `0600` permissions.

- **`auth:whoami`** now prints the active API key on the first line: `🔑 API key: <keyId>.…<tail> (len N) (source: …)`. The key id (the part before the `.`) is shown in full so two keys that share a prefix and suffix remain distinguishable; the secret is masked. `source` reports `flag` / `store "<profile>"` / `env`.

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
