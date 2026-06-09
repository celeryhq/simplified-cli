# Design: `auth:login` — API key profiles

**Date:** 2026-06-09
**Status:** Approved

## Problem

The CLI reads the API key only from the `SIMPLIFIED_API_KEY` environment variable (`src/config.ts`).
There is no in-CLI way to store, switch, or inspect keys. This causes two pains:

1. **Stale-key confusion.** A duplicated/old `SIMPLIFIED_API_KEY` export in the shell silently wins,
   so the CLI uses the wrong key (observed live: two keys sharing prefix/suffix `WZ4oW1…fGBX` vs a
   stale `cQ8AT7…7q8D`, hard to tell apart). The `whoami` key-source line (already shipped) makes the
   active key visible, but the user still has to hand-edit the shell to change it.
2. **Multi-workspace juggling.** A key is pinned to one workspace ("one Api-Key is bound to one
   workspace"). Users managing several client workspaces must swap keys constantly, with no clean
   mechanism — they edit `~/.zshrc` by hand.

## Goal

Let users store **multiple named API key profiles** in the CLI and switch the active one, mirroring
the existing `teamspace:add` / `teamspace:use` model.

## Non-goals

- Encrypting keys at rest (file perms `0600` only — matches typical CLI credential stores).
- Syncing keys across machines.
- Per-teamspace auto-key selection (a future idea; out of scope here).

## Data model

Extend the existing `Store` (`~/.simplified/config.json`):

```ts
export interface Store {
  currentTeamspace?: string;
  teamspaces?: Record<string, string>;
  // new:
  apiKeys?: Record<string, string>; // profile name -> API key
  currentApiKey?: string;           // active profile name
}
```

**Security:** `writeStore` writes the file with mode `0600` (owner read/write only), since it now
holds secrets. Apply on every write (create and rewrite). Keys live in the same `config.json` as
teamspace aliases — one store, one source of truth.

## Commands

Modeled on `teamspace:*`:

- **`auth:login <name>`** — prompt for an API key via hidden input (no echo), save it under `<name>`
  in `apiKeys`, and set `currentApiKey = <name>`. Non-interactive escape hatch: `--api-key <key>`
  (for scripts/CI). Reject empty/whitespace keys.
- **`auth:use <name>`** — set `currentApiKey = <name>`. Unknown name → clear error pointing at
  `auth:list`.
- **`auth:list`** — list saved profiles with masked keys (`<keyId>.…<tail>`), mark the active one.
- **`auth:logout [name]`** — remove a profile. No argument → remove the active profile and clear
  `currentApiKey`. Unknown name → clear error.
- **`auth:whoami`** — unchanged except it already prints the active key + source; `source` now also
  reports `'store'` when the key comes from a profile.

## Key resolution & precedence

Resolution order (highest first), implemented in `config.ts`:

```
--api-key <flag>   >   active profile (store.currentApiKey)   >   SIMPLIFIED_API_KEY (env)
```

The **stored profile wins over env** (user decision). Rationale: CI machines usually have no stored
profile, so env still works there; the conflict only arises when both exist locally.

**Env-override warning:** when `SIMPLIFIED_API_KEY` is set but ignored because a profile is active,
the CLI prints a loud warning showing both masked keys, so the situation is never silent.

`getApiKeyInfo()` is extended to return `source: 'flag' | 'store' | 'env'` and the active profile
name when applicable. `ApiKeySource` type widens accordingly.

## Hidden key input

A small helper reads the key from the terminal without echoing, using `readline` + muted stdout
(raw mode). No new dependencies (current deps: `figlet`, `yargs`). Fallback: if stdin is not a TTY
(piped), read the piped value directly so `echo $KEY | simplified auth:login ci` works.

## Error handling / edges

- `auth:use` / `auth:logout` on a missing name → actionable error + `auth:list` hint.
- No key anywhere (no flag, no profile, no env) → existing `getConfig` guidance, extended to mention
  `auth:login`.
- Empty/whitespace key on `login` → rejected with a message.
- Malformed store → already handled (`readStore` returns `{}`).

## Testing / verification

The repo has no test runner; verification is by running the real CLI end-to-end:
`auth:login` → `auth:use` → `auth:whoami` → `auth:list` → `auth:logout`, with both a valid and an
invalid key, confirming precedence and the env-override warning. Pure functions (`maskApiKey`,
precedence resolution) are kept separate so they are unit-testable if a runner is later added.

## Files touched

- `src/store.ts` — extend `Store`; `0600` perms on write.
- `src/config.ts` — extend `getApiKeyInfo` / `ApiKeySource`; precedence resolution; env-override warning.
- `src/commands/auth.ts` — `login`, `use`, `list`, `logout`; `whoami` source already done.
- `src/index.ts` — register new commands.
- `README.md` / `CHANGELOG.md` — document.
