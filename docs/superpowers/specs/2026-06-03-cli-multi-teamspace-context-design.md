# Design: Multi-teamspace context for simplified-cli

**Date:** 2026-06-03
**Status:** Approved (brainstorming) — pending backend confirmation on two API contracts

## Problem

Today the CLI authenticates with a single API key (`SIMPLIFIED_API_KEY`) sent as
`Authorization: Api-Key <key>`. That key effectively binds the CLI to **one** teamspace —
there is no way to operate against a different teamspace without swapping the key.

The token actually belongs to a **user** who has access to **multiple teamspaces** plus a
**default workspace**. We want one token and a way to switch the active context — like
`kubectl config use-context` / `gh` / `aws --profile`.

## Goals

- Keep a single token (still from `SIMPLIFIED_API_KEY`).
- Add a switchable "active teamspace" context, persisted between invocations.
- Per-command and per-session overrides (flag + env) for scripting/CI.
- Fully backward compatible: no context set ≡ today's behaviour (default workspace).
- Isolate the teamspace-injection mechanism in one place, since the exact API contract
  (header vs query param) is not yet confirmed.

## Non-goals

- Multiple tokens / named profiles (aws-style). The token is explicitly **one**. (YAGNI.)
- Storing the token in the config file. Token stays in env for now.
- A test runner. The repo has no tests today; we keep it that way and code defensively.

## Approach (chosen: A — persistent file context)

A CLI-side context layer. The token is unchanged; we add a notion of "active teamspace"
resolved from three sources and injected into every request.

```
--teamspace <id|alias>          ┐
SIMPLIFIED_TEAMSPACE_ID (env)   ├─► resolveTeamspace() ─► SimplifiedConfig.teamspaceId ─► SimplifiedAPI ─► request
~/.simplified/config.json       ┘        (alias → id)
   { currentTeamspace, teamspaces }
```

### Context model

The active context is one of:

- **default workspace** — no teamspace selected. The request carries no teamspace marker,
  so the token lands in its default workspace (exactly today's behaviour).
- **a specific teamspace** — identified by a teamspace id.

Selecting `default` (or clearing) returns to the default workspace.

### Resolution precedence (highest first)

1. `--teamspace <id|alias>` flag
2. `SIMPLIFIED_TEAMSPACE_ID` env var
3. `currentTeamspace` from `~/.simplified/config.json`
4. none → default workspace

An alias is resolved to an id if it matches a saved entry in `teamspaces`; otherwise the
value is treated as a raw teamspace id. The literal `default` always means "default
workspace" (no teamspace marker), and is reserved as an alias name.

## Components

### `src/store.ts` (new)

Pure persistence for `~/.simplified/config.json`.

```ts
interface Store {
  currentTeamspace?: string;          // teamspace id, or undefined = default workspace
  teamspaces?: Record<string, string>; // alias -> teamspace id
}

function storePath(): string;         // os.homedir() + '/.simplified/config.json'
function readStore(): Store;          // missing/corrupt file -> {} (never throws)
function writeStore(store: Store): void; // atomic: write temp file, then rename
```

- Missing or malformed file → returns `{}`; never crashes a command.
- `writeStore` creates `~/.simplified/` if absent and writes atomically (temp + rename) to
  avoid corruption on concurrent/interrupted writes.

### `src/config.ts` (extended)

- `SimplifiedConfig` gains `teamspaceId?: string`.
- New pure function, easy to reason about without I/O:

  ```ts
  function resolveTeamspace(sources: {
    flag?: string;
    env?: string;
    store: Store;
  }): { teamspaceId?: string; source: 'flag' | 'env' | 'config' | 'default' };
  ```

  Returns the resolved teamspace id (or `undefined` for default workspace) and which source
  it came from (used by `teamspace:current`).
- `getConfig()` keeps reading `SIMPLIFIED_API_KEY` / `SIMPLIFIED_API_URL`, then calls
  `resolveTeamspace` (reading the flag from a value threaded in from argv, the env var, and
  `readStore()`), and sets `teamspaceId` on the returned config.

### `src/api.ts` (extended)

- `SimplifiedAPI` stores `teamspaceId?: string` from config.
- A single private hook applies it inside `request()`:

  ```ts
  // Mechanism is PENDING backend confirmation — kept in one place so swapping
  // header <-> query param is a one-line change.
  private applyTeamspace(headers: Record<string, string>): void {
    if (this.teamspaceId) headers['X-Teamspace-Id'] = this.teamspaceId; // placeholder header
  }
  ```

- If `teamspaceId` is `undefined`, nothing is added → request is byte-for-byte today's
  request (backward compatible).

### `src/commands/teamspace.ts` (new)

Command handlers (see command table below), using `readStore`/`writeStore`.

### `src/commands/auth.ts` (new) — discovery

`whoami` handler that calls a discovery endpoint to report what the token can access
(default workspace + teamspaces). See "Discovery endpoint" — endpoint is **pending backend**;
handler degrades gracefully when it is unavailable.

### `src/index.ts` (wiring)

- Register a **global** option `--teamspace` (`global: true`) so it is accepted by every
  command and threaded into `getConfig()`.
- Register the new `teamspace:*` and `auth:whoami` commands.

## Commands

| Command | Behaviour |
|---|---|
| `teamspace:current` | Prints active teamspace **and its source** (flag / env / config / default). When none → "default workspace". |
| `teamspace:use <id\|alias>` | Sets `currentTeamspace` in the config file. `teamspace:use default` clears it (back to default workspace). |
| `teamspace:add <alias> <id>` | Saves an `alias -> id` mapping in `teamspaces`. |
| `teamspace:list` | Lists locally saved aliases with their ids and marks the active one. With `--remote`, calls discovery (see below). |
| `teamspace:remove <alias>` | Removes a saved alias. |
| `auth:whoami` | Calls discovery endpoint; prints default workspace + accessible teamspaces for the current token. Falls back to a clear "not available yet" message if the endpoint is absent. |

Global option (all commands): `--teamspace <id|alias>` — one-off override, highest precedence.
Env override: `SIMPLIFIED_TEAMSPACE_ID`.

## Discovery endpoint (PENDING backend)

Proposed contract the backend should expose so `auth:whoami` / `teamspace:list --remote`
can show what a token can access:

```
GET /api/v1/service/<tbd: me | workspaces>
Authorization: Api-Key <key>

200 ->
{
  "default_workspace": { "id": "...", "name": "..." },
  "teamspaces": [ { "id": "...", "name": "..." }, ... ]
}
```

CLI behaviour until this lands:
- `auth:whoami` attempts the call; on 404/unsupported it prints a friendly message that
  remote discovery is not available yet and points to manual `teamspace:add` / `--teamspace`.
- `teamspace:list` without `--remote` always works (purely local aliases).

This is the only piece that requires a backend change. Everything else is CLI-only.

## Error handling

- Teamspace is **optional**. Missing context is never an error — it means default workspace.
- Config file read errors → treated as empty store; commands still run.
- `teamspace:add` with a duplicate alias → overwrite with a printed notice.
- `teamspace:use <alias>` where alias is unknown → treated as a raw id (we cannot validate
  without a discovery endpoint), with a hint to run `auth:whoami` once available.
- Discovery endpoint unavailable → graceful message, non-zero only on real transport errors.

## Backward compatibility

- No `~/.simplified/config.json`, no env, no flag → identical requests to today.
- Existing commands gain `--teamspace` but do not require it.
- No change to token handling or `apiUrl`.

## Testing

The repo has no test runner; we keep it that way (per decision). Risk is mitigated by:
- Pure, side-effect-free `resolveTeamspace()` and store parsing (easy to verify by reading).
- Single-point teamspace injection in `request()`.
- Defensive file I/O (never throws on read; atomic write).

## Open items (need backend)

1. **Teamspace injection mechanism** — header (`X-Teamspace-Id`?) vs query param. Isolated in
   `applyTeamspace()`; one-line swap once confirmed.
2. **Discovery endpoint** — path and response shape per "Discovery endpoint" above.
