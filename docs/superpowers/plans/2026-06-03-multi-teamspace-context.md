# Multi-teamspace Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one API token operate against multiple teamspaces (and the default workspace) via a switchable, persisted CLI context — without changing how the token is supplied.

**Architecture:** Add a CLI-side context layer. A small JSON store (`~/.simplified/config.json`) holds the active teamspace and alias→id mappings. `getConfig()` resolves the active teamspace from flag > env > store > default and puts it on `SimplifiedConfig`. `SimplifiedAPI` injects it into every request through a single isolated hook (mechanism pending backend confirmation). New `teamspace:*` commands manage the context; `auth:whoami` reports what the token can access via a discovery endpoint (also pending backend).

**Tech Stack:** TypeScript (strict, CommonJS), yargs, tsup (esbuild) build, Node ≥22. No test runner (per spec) — verification is `npx tsc --noEmit` + `npm run build` + running the built CLI.

> **Environment note:** Run `nvm use 22` once at the start of the session before any `npm`/`npx`/`node` command.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/store.ts` | Read/write `~/.simplified/config.json` (atomic, never throws on read) | Create |
| `src/config.ts` | `SimplifiedConfig.teamspaceId`, `resolveTeamspace()`, flag override, `getConfig()` | Modify |
| `src/api.ts` | Store `teamspaceId`, inject it via `applyTeamspace()`, add `getWorkspaces()` discovery call | Modify |
| `src/commands/teamspace.ts` | `current` / `use` / `add` / `list` / `remove` handlers (local store only) | Create |
| `src/commands/auth.ts` | `whoami` handler (discovery, graceful fallback) | Create |
| `src/index.ts` | Global `--teamspace` option + middleware, register new commands | Modify |
| `README.md` | Document the context feature and commands | Modify |

---

## Task 1: Config store (`src/store.ts`)

Pure persistence for the context file. No CLI/API concerns here.

**Files:**
- Create: `src/store.ts`

- [ ] **Step 1: Write `src/store.ts`**

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface Store {
  /** Active teamspace id. Undefined = default workspace. */
  currentTeamspace?: string;
  /** Saved alias -> teamspace id mappings. */
  teamspaces?: Record<string, string>;
}

export function storeDir(): string {
  return path.join(os.homedir(), '.simplified');
}

export function storePath(): string {
  return path.join(storeDir(), 'config.json');
}

/** Read the store. Missing or malformed file returns an empty store; never throws. */
export function readStore(): Store {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Store;
    return {};
  } catch {
    return {};
  }
}

/** Write the store atomically (temp file + rename) so an interrupted write cannot corrupt it. */
export function writeStore(store: Store): void {
  const dir = storeDir();
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `config.json.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, storePath());
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test the store via a throwaway script**

Run:
```bash
node -e "const{readStore,writeStore,storePath}=require('./dist/store.js')||{};" 2>/dev/null; \
npx tsup src/store.ts --format cjs --outDir /tmp/store-check >/dev/null 2>&1 && \
node -e "const s=require('/tmp/store-check/store.js'); s.writeStore({currentTeamspace:'t1',teamspaces:{prod:'t1'}}); console.log(JSON.stringify(s.readStore())); console.log('path:',s.storePath());"
```
Expected: prints `{"currentTeamspace":"t1","teamspaces":{"prod":"t1"}}` and the path under `~/.simplified/config.json`.

- [ ] **Step 4: Clean up the test artifact**

Run: `rm -f ~/.simplified/config.json && rm -rf /tmp/store-check`
Expected: no output (file removed; commands below re-create it as needed).

- [ ] **Step 5: Commit**

```bash
git add src/store.ts
git commit -m "feat: add config store for CLI teamspace context"
```

---

## Task 2: Teamspace resolution in config (`src/config.ts`)

Add `teamspaceId` to the config, a pure `resolveTeamspace()`, a flag-override setter, and wire it into `getConfig()`.

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Replace the contents of `src/config.ts`**

```ts
import { readStore, Store } from './store';

export interface SimplifiedConfig {
  apiKey: string;
  apiUrl: string;
  /** Active teamspace id, or undefined for the token's default workspace. */
  teamspaceId?: string;
}

export type TeamspaceSource = 'flag' | 'env' | 'config' | 'default';

export interface ResolvedTeamspace {
  /** Resolved teamspace id, or undefined = default workspace. */
  teamspaceId?: string;
  /** Where the decision came from (for `teamspace:current`). */
  source: TeamspaceSource;
}

// Set from the global --teamspace flag by the yargs middleware in index.ts.
let teamspaceOverride: string | undefined;

export function setTeamspaceOverride(value?: string): void {
  teamspaceOverride = value;
}

/**
 * Resolve the active teamspace from (highest first): flag, env, store.currentTeamspace.
 * The literal "default" (or empty) means "default workspace" -> teamspaceId undefined.
 * A value matching a saved alias is translated to its id; otherwise it is used as a raw id.
 */
export function resolveTeamspace(sources: {
  flag?: string;
  env?: string;
  store: Store;
}): ResolvedTeamspace {
  let raw: string | undefined;
  let source: TeamspaceSource;

  if (sources.flag != null && sources.flag !== '') {
    raw = sources.flag;
    source = 'flag';
  } else if (sources.env != null && sources.env !== '') {
    raw = sources.env;
    source = 'env';
  } else if (sources.store.currentTeamspace != null && sources.store.currentTeamspace !== '') {
    raw = sources.store.currentTeamspace;
    source = 'config';
  } else {
    return { teamspaceId: undefined, source: 'default' };
  }

  if (raw === 'default') {
    return { teamspaceId: undefined, source };
  }

  const resolved = sources.store.teamspaces?.[raw] ?? raw;
  return { teamspaceId: resolved, source };
}

/** Resolve the active teamspace using the current flag override, env, and store. */
export function getResolvedTeamspace(): ResolvedTeamspace {
  return resolveTeamspace({
    flag: teamspaceOverride,
    env: process.env.SIMPLIFIED_TEAMSPACE_ID,
    store: readStore(),
  });
}

export function getConfig(): SimplifiedConfig {
  const apiKey = process.env.SIMPLIFIED_API_KEY;
  if (!apiKey) {
    console.error('❌ SIMPLIFIED_API_KEY environment variable is required');
    console.error('   Get your API key from: https://simplified.com → Settings → API Keys');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl: process.env.SIMPLIFIED_API_URL || 'https://api.simplified.com',
    teamspaceId: getResolvedTeamspace().teamspaceId,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: resolve active teamspace in getConfig (flag > env > store)"
```

---

## Task 3: Inject teamspace into requests + discovery call (`src/api.ts`)

Carry `teamspaceId` into `SimplifiedAPI` and inject it through one isolated hook. Add the discovery method used by `auth:whoami`.

**Files:**
- Modify: `src/api.ts` (constructor + `request()` near lines 94–137; add `getWorkspaces()` in the Assets/other section)

- [ ] **Step 1: Update the class fields and constructor**

Replace:
```ts
export class SimplifiedAPI {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: SimplifiedConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
  }
```
with:
```ts
export class SimplifiedAPI {
  private apiKey: string;
  private apiUrl: string;
  private teamspaceId?: string;

  constructor(config: SimplifiedConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.teamspaceId = config.teamspaceId;
  }

  /**
   * Inject the active teamspace into outgoing requests.
   * PENDING backend confirmation: the exact mechanism (header name vs query param)
   * is not finalised. Keep this the ONLY place that knows it, so swapping is one edit.
   * When teamspaceId is undefined the request is unchanged (token's default workspace).
   */
  private applyTeamspace(headers: Record<string, string>): void {
    if (this.teamspaceId) {
      headers['X-Teamspace-Id'] = this.teamspaceId;
    }
  }
```

- [ ] **Step 2: Build headers through the hook inside `request()`**

Replace:
```ts
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Api-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
```
with:
```ts
    const headers: Record<string, string> = {
      Authorization: `Api-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    this.applyTeamspace(headers);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
```

- [ ] **Step 3: Add the discovery method**

Add this method inside the `SimplifiedAPI` class, just before the closing `}` of the class (after `createAsset`):
```ts
  // ── Discovery ─────────────────────────────────────────────────────────────

  /**
   * Report what the current token can access: its default workspace and teamspaces.
   * PENDING backend confirmation: exact path and response shape to be finalised.
   */
  async getWorkspaces() {
    return this.request<{
      default_workspace?: { id: string; name?: string };
      teamspaces?: { id: string; name?: string }[];
    }>('GET', '/api/v1/service/workspaces');
  }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts
git commit -m "feat: inject teamspace into requests + add workspaces discovery call"
```

---

## Task 4: Teamspace context commands (`src/commands/teamspace.ts`)

Local store management — no API calls. Each handler follows the repo style (emoji output, `process.exit(1)` on user error).

**Files:**
- Create: `src/commands/teamspace.ts`

- [ ] **Step 1: Write `src/commands/teamspace.ts`**

```ts
import { readStore, writeStore } from '../store';
import { getResolvedTeamspace } from '../config';

export function teamspaceCurrent(): void {
  const { teamspaceId, source } = getResolvedTeamspace();
  if (!teamspaceId) {
    console.log(`✅ Active context: default workspace (source: ${source})`);
    return;
  }

  // Show a friendly alias name if the active id has one saved.
  const store = readStore();
  const alias = Object.entries(store.teamspaces ?? {}).find(([, id]) => id === teamspaceId)?.[0];
  const label = alias ? `${alias} (${teamspaceId})` : teamspaceId;
  console.log(`✅ Active teamspace: ${label} (source: ${source})`);
}

export function teamspaceUse(args: { target: string }): void {
  const store = readStore();

  if (args.target === 'default') {
    delete store.currentTeamspace;
    writeStore(store);
    console.log('✅ Switched to default workspace');
    return;
  }

  // Translate alias -> id if saved; otherwise treat as a raw teamspace id.
  const resolved = store.teamspaces?.[args.target] ?? args.target;
  store.currentTeamspace = resolved;
  writeStore(store);

  const note = store.teamspaces?.[args.target]
    ? `alias "${args.target}" → ${resolved}`
    : resolved;
  console.log(`✅ Active teamspace set to ${note}`);
}

export function teamspaceAdd(args: { alias: string; id: string }): void {
  if (args.alias === 'default') {
    console.error('❌ "default" is reserved (it means the default workspace)');
    process.exit(1);
  }

  const store = readStore();
  store.teamspaces = store.teamspaces ?? {};
  const existed = store.teamspaces[args.alias];
  store.teamspaces[args.alias] = args.id;
  writeStore(store);

  if (existed) {
    console.log(`✅ Updated alias "${args.alias}": ${existed} → ${args.id}`);
  } else {
    console.log(`✅ Added alias "${args.alias}" → ${args.id}`);
  }
}

export function teamspaceList(): void {
  const store = readStore();
  const entries = Object.entries(store.teamspaces ?? {});

  if (entries.length === 0) {
    console.log('No saved teamspaces. Add one with: simplified teamspace:add <alias> <id>');
    return;
  }

  const { teamspaceId } = getResolvedTeamspace();
  console.log('✅ Saved teamspaces:');
  for (const [alias, id] of entries) {
    const marker = id === teamspaceId ? ' *' : '';
    console.log(`   ${alias} → ${id}${marker}`);
  }
  if (!teamspaceId) {
    console.log('   (active context: default workspace)');
  }
}

export function teamspaceRemove(args: { alias: string }): void {
  const store = readStore();
  if (!store.teamspaces?.[args.alias]) {
    console.error(`❌ No saved alias "${args.alias}"`);
    process.exit(1);
  }

  delete store.teamspaces[args.alias];
  writeStore(store);
  console.log(`✅ Removed alias "${args.alias}"`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/teamspace.ts
git commit -m "feat: add teamspace context commands (current/use/add/list/remove)"
```

---

## Task 5: Token discovery command (`src/commands/auth.ts`)

`auth:whoami` calls the (pending) discovery endpoint and degrades gracefully when it is absent.

**Files:**
- Create: `src/commands/auth.ts`

- [ ] **Step 1: Write `src/commands/auth.ts`**

```ts
import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';

export async function whoami(): Promise<void> {
  const api = new SimplifiedAPI(getConfig());

  try {
    const result = await api.getWorkspaces();

    if (result.default_workspace) {
      const dw = result.default_workspace;
      console.log(`✅ Default workspace: ${dw.name ?? '(unnamed)'} (${dw.id})`);
    }

    const teamspaces = result.teamspaces ?? [];
    if (teamspaces.length === 0) {
      console.log('   No additional teamspaces for this token.');
    } else {
      console.log('   Teamspaces:');
      for (const t of teamspaces) {
        console.log(`     ${t.name ?? '(unnamed)'} → ${t.id}`);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // The discovery endpoint is pending backend support; treat "not found" as "not available yet".
    if (msg.includes('404') || msg.includes('405')) {
      console.error('ℹ️  Remote discovery is not available yet on this account/API.');
      console.error('   Set the teamspace manually: simplified teamspace:add <alias> <id>');
      console.error('   then: simplified teamspace:use <alias>  (or pass --teamspace <id>)');
      process.exit(1);
    }
    console.error(`❌ Failed to fetch workspaces: ${msg}`);
    process.exit(1);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/commands/auth.ts
git commit -m "feat: add auth:whoami token discovery command"
```

---

## Task 6: Wire commands and the global flag (`src/index.ts`)

Add the global `--teamspace` option, a middleware that feeds it to the resolver, and register the new commands.

**Files:**
- Modify: `src/index.ts` (imports near lines 14–59; yargs chain near lines 98–101 and before `.demandCommand` at line 936)

- [ ] **Step 1: Add imports**

After the existing `import { uploadAsset, importAsset, getAsset } from './commands/assets';` line, add:
```ts
import { setTeamspaceOverride } from './config';
import {
  teamspaceCurrent,
  teamspaceUse,
  teamspaceAdd,
  teamspaceList,
  teamspaceRemove,
} from './commands/teamspace';
import { whoami } from './commands/auth';
```

- [ ] **Step 2: Add the global option and middleware**

Replace:
```ts
yargs(argv)
  .scriptName('simplified')
  .usage('$0 <command> [options]')
```
with:
```ts
yargs(argv)
  .scriptName('simplified')
  .usage('$0 <command> [options]')
  .option('teamspace', {
    type: 'string',
    describe: 'Teamspace id or saved alias for this command (overrides env and saved context)',
    global: true,
  })
  .middleware((a) => {
    setTeamspaceOverride(a.teamspace as string | undefined);
  })
```

- [ ] **Step 3: Register the new commands**

Immediately before the line `.demandCommand(1, 'You need to provide a command. Run --help for usage.')`, insert:
```ts
  // ── Teamspace context ───────────────────────────────────────────────────────
  .command(
    'teamspace:current',
    'Show the active teamspace context and where it came from',
    (y: Argv) => y,
    () => teamspaceCurrent()
  )
  .command(
    'teamspace:use <target>',
    'Switch the active teamspace (id, saved alias, or "default" for the default workspace)',
    (y: Argv) =>
      y.positional('target', {
        type: 'string',
        describe: 'Teamspace id, saved alias, or "default"',
        demandOption: true,
      }),
    (a) => teamspaceUse({ target: a.target as string })
  )
  .command(
    'teamspace:add <alias> <id>',
    'Save an alias for a teamspace id',
    (y: Argv) =>
      y
        .positional('alias', { type: 'string', describe: 'Short alias', demandOption: true })
        .positional('id', { type: 'string', describe: 'Teamspace id', demandOption: true }),
    (a) => teamspaceAdd({ alias: a.alias as string, id: a.id as string })
  )
  .command(
    'teamspace:list',
    'List saved teamspace aliases and mark the active one',
    (y: Argv) => y,
    () => teamspaceList()
  )
  .command(
    'teamspace:remove <alias>',
    'Remove a saved teamspace alias',
    (y: Argv) =>
      y.positional('alias', { type: 'string', describe: 'Alias to remove', demandOption: true }),
    (a) => teamspaceRemove({ alias: a.alias as string })
  )

  // ── Auth ─────────────────────────────────────────────────────────────────────
  .command(
    'auth:whoami',
    'Show the default workspace and teamspaces accessible to the current token',
    (y: Argv) => y,
    () => whoami()
  )
```

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; `dist/index.js` is produced.

- [ ] **Step 5: Functional verification of the context flow**

Run:
```bash
rm -f ~/.simplified/config.json
node dist/index.js teamspace:current
node dist/index.js teamspace:add prod ts_123
node dist/index.js teamspace:add staging ts_456
node dist/index.js teamspace:list
node dist/index.js teamspace:use prod
node dist/index.js teamspace:current
SIMPLIFIED_TEAMSPACE_ID=ts_env node dist/index.js teamspace:current
node dist/index.js --teamspace staging teamspace:current
node dist/index.js teamspace:use default
node dist/index.js teamspace:current
node dist/index.js teamspace:remove prod
node dist/index.js teamspace:list
```
Expected, in order:
1. `default workspace (source: default)`
2. `Added alias "prod" → ts_123`
3. `Added alias "staging" → ts_456`
4. list showing `prod → ts_123` and `staging → ts_456`, with `(active context: default workspace)`
5. `Active teamspace set to alias "prod" → ts_123`
6. `Active teamspace: prod (ts_123) (source: config)`
7. env override: `Active teamspace: ts_env (source: env)`
8. flag override resolves the alias: `Active teamspace: staging (ts_456) (source: flag)`
9. `Switched to default workspace`
10. `default workspace (source: default)`
11. `Removed alias "prod"`
12. list showing only `staging → ts_456`

- [ ] **Step 6: Clean up local test state**

Run: `rm -f ~/.simplified/config.json`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire teamspace context commands and global --teamspace flag"
```

---

## Task 7: Documentation

Document the new context model and commands so users know one token now spans teamspaces.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Teamspace context" section to `README.md`**

Find the section that documents authentication / `SIMPLIFIED_API_KEY` and add, right after it, a new section:

```markdown
## Teamspace context

Your API token may have access to several teamspaces plus a default workspace.
The CLI keeps a switchable active context so you don't need multiple tokens.

Resolution order (highest first): `--teamspace` flag → `SIMPLIFIED_TEAMSPACE_ID` env → saved context (`~/.simplified/config.json`) → default workspace.

```bash
# See what the token can access (requires backend discovery support)
simplified auth:whoami

# Save friendly aliases for teamspace ids
simplified teamspace:add prod ts_abc123
simplified teamspace:add staging ts_def456

# Switch the active context (persisted)
simplified teamspace:use prod
simplified teamspace:current          # -> Active teamspace: prod (ts_abc123)

# Back to the default workspace
simplified teamspace:use default

# One-off override for a single command (does not change saved context)
simplified accounts:list --teamspace staging
SIMPLIFIED_TEAMSPACE_ID=ts_abc123 simplified accounts:list

# Manage aliases
simplified teamspace:list
simplified teamspace:remove staging
```

If no teamspace is set, the CLI behaves exactly as before — the token uses its default workspace.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document teamspace context commands in README"
```

---

## Self-Review Notes

- **Spec coverage:** single token kept (config.ts unchanged token path) ✓; default-vs-teamspace model (`resolveTeamspace`, `teamspace:use default`) ✓; precedence flag>env>config>default (Task 2 + Task 6 verification) ✓; backward compatible (undefined teamspace → unchanged request, Task 3 `applyTeamspace`) ✓; isolated injection mechanism (single `applyTeamspace`) ✓; commands `current/use/add/list/remove` (Task 4) ✓; `auth:whoami` discovery with graceful fallback (Task 5) ✓; no test runner (verification via tsc/build/run) ✓; pending backend items flagged in code comments (Task 3 header + `getWorkspaces`) ✓.
- **Type consistency:** `Store`, `SimplifiedConfig.teamspaceId`, `resolveTeamspace`, `getResolvedTeamspace`, `setTeamspaceOverride`, `applyTeamspace`, `getWorkspaces` are defined before use and referenced with matching names/signatures across tasks.
- **No placeholders:** every code step contains full code; verification steps give exact commands and expected output.

## Pending backend items (do not block CLI work)

1. Teamspace injection mechanism — header `X-Teamspace-Id` is a placeholder in `applyTeamspace()`; swap to the confirmed header/query param (one edit).
2. Discovery endpoint — `getWorkspaces()` targets `/api/v1/service/workspaces` with an assumed shape; update path/shape once backend confirms.
