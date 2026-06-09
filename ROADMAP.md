# Roadmap

Ideas and improvements that are not yet scheduled. Add new items at the top of the relevant section.

## Authentication

### ✅ `auth:login` command — DONE (Unreleased)

Implemented as named API key profiles (`auth:login` / `auth:use` / `auth:list` / `auth:logout`,
global `--api-key` flag), precedence `flag > profile > env` with an env-override warning, keys stored
`0600` in `~/.simplified/config.json`. See `docs/superpowers/specs/2026-06-09-auth-login-design.md`
and the CHANGELOG. Original idea kept below for reference.

### `auth:login` command (original idea)

**Idea:** Add an `auth:login` command so users can store and switch API keys from the CLI itself, instead of editing `SIMPLIFIED_API_KEY` by hand in their shell profile.

**Why it would help:**
- Today the token is read only from the `SIMPLIFIED_API_KEY` env var (`src/config.ts:71`). There is no in-CLI way to set, change, or store it.
- Editing `~/.zshrc` is error-prone — keys easily get duplicated (we saw the same export 5x; last one silently wins).
- A key is bound to one workspace ("one Api-Key is bound to one workspace; use a separate key per workspace"). Users juggling multiple client workspaces have no clean way to store and switch between keys.

**Possible shape:**
- `auth:login` — prompt for an API key (hidden input) and persist it to the existing store (`src/store.ts`, same `config.json` used for teamspace aliases).
- `auth:logout` — clear the stored key.
- Support multiple named keys (e.g. per workspace/client) and a way to switch the active one, mirroring the existing `teamspace:add` / `teamspace:use` aliasing model.
- Resolution order: `--api-key` flag > `SIMPLIFIED_API_KEY` env > stored key. Keep env var working for CI.
- Store the key with restrictive file permissions (0600).
- When `SIMPLIFIED_API_KEY` env is set AND a stored key exists, warn that env overrides the logged-in key (env duplication once caused a stale key to silently win — see done item below).

**Done so far:**
- ✅ `auth:whoami` now prints the active key id + source: `🔑 API key: <keyId>.…<tail> (len N) (source: env)`. The keyId (before the dot) is shown in full so two keys that share a prefix/suffix are still distinguishable. Helpers `getApiKeyInfo` / `maskApiKey` in `src/config.ts`; `source` is wired to extend to `'store'` once login lands.

**Related:** teamspace context already has `teamspace:add` / `teamspace:use` / `teamspace:list` — `auth:*` could follow the same UX pattern.
