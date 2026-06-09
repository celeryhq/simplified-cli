# Brand Kits, Context Documents & Projects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 22 CLI commands for Brand Kits, Context Documents and Projects/Items to `simplified-cli`, plus a narrow vitest layer for the input helpers and the `request()` 204 change, and skill/reference docs.

**Architecture:** Follow the existing three-layer pattern — typed methods on `SimplifiedAPI` (`src/api.ts`) → thin command handlers (`src/commands/*.ts`) → yargs registration (`src/index.ts`). All non-trivial logic (body assembly, mutual-exclusion validation) lives in a new pure `src/commands/_shared.ts` so it is unit-testable without network or `process.exit` mocking. The apikit endpoints share the existing host, auth header, and `Space` (teamspace) header, so only one shared change is needed: `request()` must tolerate `204 No Content`.

**Tech Stack:** TypeScript, yargs, tsup (build), vitest (new — test runner), Node 22.

**Spec:** `docs/superpowers/specs/2026-06-09-brandkit-projects-design.md`

**Environment note:** Run `nvm use 22` before any `npm`/`npx`/`tsc` command.

---

## File structure

| File | Responsibility | Action |
|---|---|---|
| `src/api.ts` | 22 new `SimplifiedAPI` methods; `request()` 204 fix; request/response interfaces | Modify |
| `src/commands/_shared.ts` | Pure input helpers: `loadJsonBody`, `readContent`, `requireXor`, `parseJsonFlag` | Create |
| `src/commands/_shared.test.ts` | Unit tests for the helpers | Create |
| `src/api.test.ts` | Unit tests for URL/query/header construction + 204 behaviour | Create |
| `src/commands/brandkit.ts` | 11 handlers (6 brand kit + 5 context document) | Create |
| `src/commands/projects.ts` | 11 handlers (5 project + 6 item) | Create |
| `src/index.ts` | Register 22 yargs commands | Modify |
| `package.json` | `vitest` devDep + `test` scripts | Modify |
| `skills/simplified-cli/references/BRAND_KIT.md` | Reference doc: brand kit + context | Create |
| `skills/simplified-cli/references/PROJECTS.md` | Reference doc: projects + items | Create |
| `skills/simplified-cli/SKILL.md` | Add command sections | Modify |
| `README.md` | Add command list | Modify |
| `CHANGELOG.md` | `[Unreleased]` entry | Modify |

---

## Task 1: Add vitest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add vitest dev dependency**

Run:
```bash
nvm use 22 && npm install -D vitest@^2.1.0
```
Expected: `vitest` appears under `devDependencies` in `package.json`, install succeeds.

- [ ] **Step 2: Add test scripts**

In `package.json`, under `"scripts"`, add `test` and `test:watch` (keep the existing
`dev`/`build`/`start`/`prepublishOnly`):

```jsonc
"scripts": {
  "dev": "tsup --watch",
  "build": "tsup",
  "start": "node dist/index.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "prepublishOnly": "npm run build"
},
```

- [ ] **Step 3: Verify vitest runs (no tests yet)**

Run: `nvm use 22 && npx vitest run`
Expected: vitest starts and reports `No test files found` (exit code is non-zero but that
is fine — the next task adds the first test). Do not treat "no test files" as a failure.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add vitest runner and test scripts"
```

---

## Task 2: Make `request()` tolerate 204 No Content

The `DELETE` endpoints (`context-delete`, `projects:delete`, `item-delete`) return
`204 No Content`. The current `request()` ends with `return response.json()`, which throws
on an empty body. This task makes `request()` return `undefined` for empty bodies — and
because `request()` is shared by every existing command, it is covered by a regression test.

**Files:**
- Test: `src/api.test.ts` (create)
- Modify: `src/api.ts:125-178` (the `request` method)

- [ ] **Step 1: Write the failing test**

Create `src/api.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimplifiedAPI } from './api';

const baseConfig = { apiKey: 'kid.secret', apiUrl: 'https://api.simplified.com' };

function mockFetchOnce(value: Partial<Response>) {
  (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(value as Response);
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

describe('request() 204 handling', () => {
  it('returns undefined on 204 without calling json()', async () => {
    const json = vi.fn();
    mockFetchOnce({ ok: true, status: 204, json, text: async () => '' });
    const api = new SimplifiedAPI(baseConfig);
    const result = await api.deleteProject('blogger', 'proj_1');
    expect(result).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('still parses JSON on 200', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ id: 'bk_1' }) });
    const api = new SimplifiedAPI(baseConfig);
    const result = await api.getBrandKit('bk_1');
    expect(result).toEqual({ id: 'bk_1' });
  });
});
```

The test references `getBrandKit` and `deleteProject`. To keep Task 2 self-contained, add
these two methods to `src/api.ts` now so the test compiles — they are the real, final
definitions and are simply left in place by Tasks 4 and 5 (do not re-add them there). Add
them to the class body (anywhere; the Brand Kit / Projects sections land around them later):

```ts
  async getBrandKit(brandId: string, params?: { expand?: string; fields?: string; omit?: string }) {
    return this.request<unknown>('GET', `/api/v2/brandkits/${brandId}`, undefined, params as Record<string, string | undefined>);
  }
  async deleteProject(resourcetype: string, id: string) {
    return this.request<unknown>('DELETE', `/api/v1/projects/${resourcetype}/${id}`);
  }
```

Why this test goes red before the fix: the 204 mock supplies `json: vi.fn()`, and the
current `request()` ends with `return response.json()` — so `json` **is** called, failing
`expect(json).not.toHaveBeenCalled()`. The fix short-circuits on 204 before parsing.

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22 && npx vitest run src/api.test.ts`
Expected: the 204 test FAILS — current `request()` calls `response.json()` on the 204 mock
(which returns undefined here, but the real failure mode is the empty-body parse). Confirm
red before implementing.

- [ ] **Step 3: Implement the 204 fix**

In `src/api.ts`, replace the final `return response.json() as Promise<T>;` of `request()`
(around line 177) with:

```ts
    // 204 No Content (DELETE) and empty bodies have nothing to parse. Returning the raw
    // json() here would throw on an empty body, so short-circuit to undefined.
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/api.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Build to confirm no type regressions**

Run: `nvm use 22 && npm run build`
Expected: tsup build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/api.ts src/api.test.ts
git commit -m "fix(api): tolerate 204/empty responses in request()"
```

---

## Task 3: Input helpers (`_shared.ts`) with tests

These pure helpers hold the only non-trivial logic in the feature: assembling a request
body from `--json <file>` / `--data '<json>'` / scalar flags, and enforcing mutual
exclusions. No network, no `process.exit` — they **throw** on invalid input, and handlers
translate the throw into `console.error` + `process.exit(1)`.

**Files:**
- Create: `src/commands/_shared.ts`
- Test: `src/commands/_shared.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/commands/_shared.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import { loadJsonBody, readContent, requireXor } from './_shared';

afterEach(() => vi.restoreAllMocks());

describe('loadJsonBody', () => {
  it('parses inline --data', () => {
    expect(loadJsonBody({ data: '{"a":1}' })).toEqual({ a: 1 });
  });

  it('reads a --json file', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"b":2}');
    expect(loadJsonBody({ json: 'body.json' })).toEqual({ b: 2 });
  });

  it('scalar overrides win over the --json file body', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"title":"FromFile"}');
    expect(loadJsonBody({ json: 'p.json' }, { title: 'Override' })).toEqual({ title: 'Override' });
  });

  it('throws when both --json and --data are given', () => {
    expect(() => loadJsonBody({ json: 'a.json', data: '{}' })).toThrow(/only one of --json or --data/i);
  });

  it('throws on invalid inline JSON', () => {
    expect(() => loadJsonBody({ data: 'not json' })).toThrow(/valid json/i);
  });

  it('returns the overrides alone when no json/data supplied', () => {
    expect(loadJsonBody({}, { title: 'X' })).toEqual({ title: 'X' });
  });
});

describe('readContent', () => {
  it('returns inline content', () => {
    expect(readContent('hello', undefined)).toBe('hello');
  });

  it('reads content from a file', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('# Title');
    expect(readContent(undefined, 'note.md')).toBe('# Title');
  });

  it('throws when both inline and file are given', () => {
    expect(() => readContent('hi', 'note.md')).toThrow(/only one of --content or --content-file/i);
  });

  it('returns undefined when neither is given', () => {
    expect(readContent(undefined, undefined)).toBeUndefined();
  });
});

describe('requireXor', () => {
  it('passes when exactly one side is present', () => {
    expect(() => requireXor('--a', 'x', '--b', undefined)).not.toThrow();
  });

  it('throws when neither side is present', () => {
    expect(() => requireXor('--a', undefined, '--b', undefined)).toThrow(/either --a or --b/i);
  });

  it('throws when both sides are present', () => {
    expect(() => requireXor('--a', 'x', '--b', 'y')).toThrow(/not both/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nvm use 22 && npx vitest run src/commands/_shared.test.ts`
Expected: FAIL — `Cannot find module './_shared'` (or undefined exports).

- [ ] **Step 3: Implement `_shared.ts`**

Create `src/commands/_shared.ts`:

```ts
import { readFileSync } from 'fs';

/** Parse an inline JSON string, throwing a friendly error on malformed input. */
function parseInlineJson(input: string, flag: string): Record<string, unknown> {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    throw new Error(`${flag} must be valid JSON`);
  }
}

/**
 * Resolve a request body from `--json <file>` or `--data '<json>'`, then shallow-merge
 * scalar overrides on top (so dedicated flags like --title win over the file/inline body).
 * `--json` and `--data` are mutually exclusive.
 */
export function loadJsonBody(
  source: { json?: string; data?: string },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  if (source.json && source.data) {
    throw new Error('Provide only one of --json or --data, not both.');
  }

  let base: Record<string, unknown> = {};
  if (source.json) {
    let text: string;
    try {
      text = readFileSync(source.json, 'utf-8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to read JSON file "${source.json}": ${msg}`);
    }
    base = parseInlineJson(text, `--json file "${source.json}"`);
  } else if (source.data) {
    base = parseInlineJson(source.data, '--data');
  }

  const cleanedOverrides: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) cleanedOverrides[k] = v;
  }
  return { ...base, ...cleanedOverrides };
}

/**
 * Resolve markdown content from inline text or a file path. Mutually exclusive.
 * Returns undefined when neither is supplied.
 */
export function readContent(text?: string, file?: string): string | undefined {
  if (text !== undefined && file !== undefined) {
    throw new Error('Provide only one of --content or --content-file, not both.');
  }
  if (file !== undefined) {
    try {
      return readFileSync(file, 'utf-8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to read content file "${file}": ${msg}`);
    }
  }
  return text;
}

/** Enforce that exactly one of two mutually-exclusive inputs is present. */
export function requireXor(
  aFlag: string,
  aValue: unknown,
  bFlag: string,
  bValue: unknown
): void {
  const hasA = aValue !== undefined && aValue !== '';
  const hasB = bValue !== undefined && bValue !== '';
  if (!hasA && !hasB) {
    throw new Error(`Provide either ${aFlag} or ${bFlag}.`);
  }
  if (hasA && hasB) {
    throw new Error(`Provide ${aFlag} or ${bFlag}, not both.`);
  }
}

/** Split a comma-separated list into a trimmed, non-empty string array. */
export function parseList(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/commands/_shared.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/_shared.ts src/commands/_shared.test.ts
git commit -m "feat(commands): add shared input helpers with tests"
```

---

## Task 4: API methods — Brand Kits + Context Documents

Add the 11 brand-kit/context methods to `SimplifiedAPI`. The `getBrandKit` /
`deleteProject` stubs added in Task 2 stay; this task adds the rest. Includes two URL/query
construction tests.

**Files:**
- Modify: `src/api.ts` (add methods + a `// ── Brand Kits ──` section)
- Test: `src/api.test.ts` (add a `describe` block)

- [ ] **Step 1: Write the failing tests**

Append to `src/api.test.ts`:

```ts
describe('brand kit URL/query construction', () => {
  it('getBrandKit encodes expand and injects the Space header', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({}) });
    const api = new SimplifiedAPI({ ...baseConfig, teamspaceId: '42' });
    await api.getBrandKit('bk_1', { expand: 'extra,website' });
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.simplified.com/api/v2/brandkits/bk_1?expand=extra%2Cwebsite');
    expect((init as RequestInit).headers).toMatchObject({ Space: '42' });
  });

  it('listContextDocuments forwards canonical_key and ordering as query params', async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({}) });
    const api = new SimplifiedAPI(baseConfig);
    await api.listContextDocuments('bk_1', { canonical_key: 'brand_voice', ordering: '-created' });
    const [url] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(
      'https://api.simplified.com/api/v1/brandkit/bk_1/context-documents?canonical_key=brand_voice&ordering=-created'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nvm use 22 && npx vitest run src/api.test.ts`
Expected: FAIL — `listContextDocuments` does not exist yet (and `getBrandKit` may need its
params signature). Confirm red.

- [ ] **Step 3: Implement the methods**

In `src/api.ts`, add a new section just before `// ── Discovery ──`. Keep the `getBrandKit`
stub from Task 2 (it already matches the signature below) — add the remaining methods:

```ts
  // ── Brand Kits ────────────────────────────────────────────────────────────

  async listBrandKits(params?: { search?: string }) {
    return this.request<unknown>('GET', '/api/v2/brandkits', undefined, params as Record<string, string | undefined>);
  }

  async createBrandKit(data: { title: string; extra?: { description?: string; social_links?: unknown[] } }) {
    return this.request<unknown>('POST', '/api/v1/brandkit', data);
  }

  // getBrandKit(...) — defined in Task 2; signature:
  //   (brandId: string, params?: { expand?: string; fields?: string; omit?: string })

  async getBrandBook(brandId: string, params?: { elements?: string }) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/brandbook`, undefined, params as Record<string, string | undefined>);
  }

  async buildBrandKit(brandId: string, body: Record<string, unknown>) {
    return this.request<{
      brand_kit_id?: string;
      status?: string;
      version?: number;
      warnings?: string[];
    }>('POST', `/api/v2/brandkits/${brandId}/build`, body);
  }

  async importBrandKitModules(brandId: string, body: Record<string, unknown>) {
    return this.request<unknown>('PATCH', `/api/v1/brandkit/${brandId}/import-modules`, body);
  }

  // ── Context Documents ─────────────────────────────────────────────────────

  async listContextDocuments(brandId: string, params?: { canonical_key?: string; search?: string; ordering?: string }) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/context-documents`, undefined, params as Record<string, string | undefined>);
  }

  async createContextDocument(brandId: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/brandkit/${brandId}/context-documents`, body);
  }

  async updateContextDocument(brandId: string, documentLinkId: string, body: Record<string, unknown>) {
    return this.request<unknown>('PATCH', `/api/v1/brandkit/${brandId}/context-documents/${documentLinkId}`, body);
  }

  async deleteContextDocument(brandId: string, documentLinkId: string) {
    return this.request<unknown>('DELETE', `/api/v1/brandkit/${brandId}/context-documents/${documentLinkId}`);
  }

  async getContextDocumentByType(brandId: string, contextType: string) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/context-documents/by-type/${contextType}`);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `nvm use 22 && npx vitest run src/api.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts src/api.test.ts
git commit -m "feat(api): add brand kit and context document methods"
```

---

## Task 5: API methods — Projects + Items

Add the 11 project/item methods. The `deleteProject` stub from Task 2 stays.

**Files:**
- Modify: `src/api.ts` (add a `// ── Projects ──` section)

- [ ] **Step 1: Add the methods**

In `src/api.ts`, after the Context Documents section, add:

```ts
  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(resourcetype: string, params?: { primary_type?: string; ordering?: string; search?: string }) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}`, undefined, params as Record<string, string | undefined>);
  }

  async createProject(resourcetype: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}`, body);
  }

  async getProject(resourcetype: string, id: string) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${id}`);
  }

  // deleteProject(...) — defined in Task 2; signature: (resourcetype: string, id: string)

  async exportProjectItems(resourcetype: string, id: string, body: { partner_id: number; item_ids: string[] }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${id}/export-items`, body);
  }

  // ── Project Items ─────────────────────────────────────────────────────────

  async listProjectItems(resourcetype: string, projectId: string, params?: { primary_type?: string; ordering?: string; search?: string }) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${projectId}/items`, undefined, params as Record<string, string | undefined>);
  }

  async createProjectItem(resourcetype: string, projectId: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items`, body);
  }

  async getProjectItem(resourcetype: string, projectId: string, id: string) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}`);
  }

  async deleteProjectItem(resourcetype: string, projectId: string, id: string) {
    return this.request<unknown>('DELETE', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}`);
  }

  async assignAgentToItem(resourcetype: string, projectId: string, id: string, body: { agent_id: string }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}/assign-agent`, body);
  }

  async reorderProjectItem(resourcetype: string, projectId: string, id: string, body: { position: number }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}/reorder`, body);
  }
```

- [ ] **Step 2: Build to confirm types**

Run: `nvm use 22 && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Run full test suite (regression)**

Run: `nvm use 22 && npx vitest run`
Expected: all tests from Tasks 2–4 still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/api.ts
git commit -m "feat(api): add projects and project item methods"
```

---

## Task 6: Brand Kit handlers (`brandkit.ts` — 6 core commands)

Thin handlers wrapping the API. They catch helper throws (validation) and API errors the
same way: `console.error('❌ …')` + `process.exit(1)`.

**Files:**
- Create: `src/commands/brandkit.ts`

- [ ] **Step 1: Implement the 6 brand-kit handlers**

Create `src/commands/brandkit.ts`:

```ts
import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';
import { loadJsonBody, readContent, requireXor } from './_shared';

/** Run an async handler, printing the result or failing with the standard error format. */
async function run(action: string, fn: (api: SimplifiedAPI) => Promise<unknown>): Promise<void> {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await fn(api);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to ${action}: ${msg}`);
    process.exit(1);
  }
}

export async function brandkitList(args: { search?: string }) {
  await run('list brand kits', (api) => api.listBrandKits({ search: args.search }));
}

export async function brandkitCreate(args: {
  title?: string;
  description?: string;
  'social-links'?: string;
  json?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    let body: Record<string, unknown>;
    if (args.json) {
      body = loadJsonBody({ json: args.json });
    } else {
      if (!args.title) {
        throw new Error('--title is required (or use --json <file> for the full body)');
      }
      const extra: Record<string, unknown> = {};
      if (args.description !== undefined) extra.description = args.description;
      if (args['social-links']) {
        extra.social_links = loadJsonBody({ data: args['social-links'] }) as unknown;
      }
      body = { title: args.title, ...(Object.keys(extra).length > 0 && { extra }) };
    }
    const result = await api.createBrandKit(body as { title: string });
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create brand kit: ${msg}`);
    process.exit(1);
  }
}
```

Note: `--social-links` expects a JSON array string (e.g. `'[{"type":"website","url":"https://x.com"}]'`).
`loadJsonBody({ data })` parses it; arrays parse fine through `JSON.parse`.

Continue in the same file:

```ts
export async function brandkitGet(args: { brand: string; expand?: string; fields?: string; omit?: string }) {
  await run('get brand kit', (api) =>
    api.getBrandKit(args.brand, { expand: args.expand, fields: args.fields, omit: args.omit })
  );
}

export async function brandkitBrandbook(args: { brand: string; elements?: string }) {
  await run('get brand book', (api) => api.getBrandBook(args.brand, { elements: args.elements }));
}

export async function brandkitBuild(args: { brand: string; json?: string; data?: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const body = loadJsonBody({ json: args.json, data: args.data });
    const result = await api.buildBrandKit(args.brand, body);
    console.log(JSON.stringify(result, null, 2));
    if (result && Array.isArray(result.warnings) && result.warnings.length > 0) {
      console.error(`⚠️  Warnings:\n   - ${result.warnings.join('\n   - ')}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to build brand kit: ${msg}`);
    process.exit(1);
  }
}

export async function brandkitImport(args: { brand: string; json?: string; data?: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const body = loadJsonBody({ json: args.json, data: args.data });
    if (Object.keys(body).length === 0) {
      throw new Error('Provide module data via --json <file> or --data \'<json>\'');
    }
    const result = await api.importBrandKitModules(args.brand, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to import brand kit modules: ${msg}`);
    process.exit(1);
  }
}
```

- [ ] **Step 2: Build to confirm types**

Run: `nvm use 22 && npm run build`
Expected: build succeeds. (The handlers are not yet registered in `index.ts` — that is
Task 8 — but they must compile.)

- [ ] **Step 3: Commit**

```bash
git add src/commands/brandkit.ts
git commit -m "feat(commands): add brand kit handlers"
```

---

## Task 7: Context Document handlers (append to `brandkit.ts` — 5 commands)

**Files:**
- Modify: `src/commands/brandkit.ts` (append)

- [ ] **Step 1: Implement the 5 context handlers**

Append to `src/commands/brandkit.ts`:

```ts
export async function contextList(args: {
  brand: string;
  'canonical-key'?: string;
  search?: string;
  ordering?: string;
}) {
  await run('list context documents', (api) =>
    api.listContextDocuments(args.brand, {
      canonical_key: args['canonical-key'],
      search: args.search,
      ordering: args.ordering,
    })
  );
}

export async function contextCreate(args: {
  brand: string;
  'document-id'?: string;
  'doc-type'?: string;
  name?: string;
  description?: string;
  content?: string;
  'content-file'?: string;
  data?: string;
  json?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    let body: Record<string, unknown>;
    if (args.json) {
      body = loadJsonBody({ json: args.json });
    } else {
      // Two creation modes: link an existing doc (document-id) XOR inline (doc-type + name).
      requireXor('--document-id', args['document-id'], '--doc-type', args['doc-type']);
      if (args['document-id']) {
        body = { document_id: args['document-id'] };
      } else {
        if (!args.name) throw new Error('--name is required for inline creation (with --doc-type)');
        const content = readContent(args.content, args['content-file']);
        body = {
          doc_type: args['doc-type'],
          name: args.name,
          ...(args.description !== undefined && { description: args.description }),
          ...(content !== undefined && { content }),
          ...(args.data && { data: loadJsonBody({ data: args.data }) }),
        };
      }
    }
    const result = await api.createContextDocument(args.brand, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create context document: ${msg}`);
    process.exit(1);
  }
}

export async function contextUpdate(args: {
  brand: string;
  link: string;
  name?: string;
  description?: string;
  content?: string;
  'content-file'?: string;
  data?: string;
  json?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    let body: Record<string, unknown>;
    if (args.json) {
      body = loadJsonBody({ json: args.json });
    } else {
      const content = readContent(args.content, args['content-file']);
      body = {
        ...(args.name !== undefined && { name: args.name }),
        ...(args.description !== undefined && { description: args.description }),
        ...(content !== undefined && { content }),
        ...(args.data && { data: loadJsonBody({ data: args.data }) }),
      };
      if (Object.keys(body).length === 0) {
        throw new Error('Provide at least one field to update (--name, --description, --content, --content-file, --data, or --json)');
      }
    }
    const result = await api.updateContextDocument(args.brand, args.link, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to update context document: ${msg}`);
    process.exit(1);
  }
}

export async function contextDelete(args: { brand: string; link: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await api.deleteContextDocument(args.brand, args.link);
    console.log('✅ Context document deleted');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to delete context document: ${msg}`);
    process.exit(1);
  }
}

export async function contextGet(args: { brand: string; type: string }) {
  await run('get context document', (api) => api.getContextDocumentByType(args.brand, args.type));
}
```

- [ ] **Step 2: Build to confirm types**

Run: `nvm use 22 && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/commands/brandkit.ts
git commit -m "feat(commands): add context document handlers"
```

---

## Task 8: Register Brand Kit + Context commands in `index.ts`

**Files:**
- Modify: `src/index.ts` (imports near line 68; command block before `.demandCommand`)

- [ ] **Step 1: Add the import**

After the existing `auth` import (`src/index.ts:68`), add:

```ts
import {
  brandkitList,
  brandkitCreate,
  brandkitGet,
  brandkitBrandbook,
  brandkitBuild,
  brandkitImport,
  contextList,
  contextCreate,
  contextUpdate,
  contextDelete,
  contextGet,
} from './commands/brandkit';
```

- [ ] **Step 2: Define the context_type enum constant**

Near the top of `src/index.ts` (after the `videoGenerationOptions` const, before
`const argv = ...`), add:

```ts
const CONTEXT_TYPES = [
  'brand_voice', 'style_guide', 'seo_guidelines', 'internal_links', 'target_keywords',
  'features', 'competitor_analysis', 'writing_examples', 'cro_best_practices',
  'company_research', 'brand_profile', 'market_positioning', 'icps', 'usps',
  'content_pillars', 'marketing_strategy',
] as const;
```

- [ ] **Step 3: Register the 11 commands**

In the command chain, before `.demandCommand(1, ...)` (around `src/index.ts:1042`), insert:

```ts
  // ── Brand Kits ──────────────────────────────────────────────────────────────
  .command(
    'brandkit:list',
    'List brand kits in the workspace',
    (y: Argv) => y.option('search', { type: 'string', description: 'Filter brand kits by title' }),
    brandkitList
  )
  .command(
    'brandkit:create',
    'Create a brand kit (only --title is required)',
    (y: Argv) =>
      y
        .option('title', { type: 'string', description: 'Brand name (required unless --json)' })
        .option('description', { type: 'string', description: 'Short brand description' })
        .option('social-links', { type: 'string', description: 'JSON array of {type,url} link objects' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 brandkit:create --title "Velle Studio"', 'Create a brand kit'),
    brandkitCreate
  )
  .command(
    'brandkit:get',
    'Get a brand kit by id',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('expand', { type: 'string', description: 'Comma-separated expansions: extra, website' })
        .option('fields', { type: 'string', description: 'Comma-separated top-level keys to include' })
        .option('omit', { type: 'string', description: 'Comma-separated top-level keys to exclude' })
        .example('$0 brandkit:get --brand <id> --expand extra,website', 'Full brand envelope'),
    brandkitGet
  )
  .command(
    'brandkit:brandbook',
    'Get brand book data (optimized for AI/integrations)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('elements', {
          type: 'string',
          description: 'Comma-separated elements (e.g. brief,voices,colors,fonts,logos,usps,icps). Omit for base data only.',
        })
        .example('$0 brandkit:brandbook --brand <id> --elements "brief,voices,colors"', 'Selected elements'),
    brandkitBrandbook
  )
  .command(
    'brandkit:build',
    'Populate a brand kit with a canonical BrandKitDocument (brand, social_links, style)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('json', { type: 'string', description: 'Path to JSON file with the document body' })
        .option('data', { type: 'string', description: 'Inline JSON document body (alternative to --json)' })
        .example('$0 brandkit:build --brand <id> --json style.json', 'Build from a file'),
    brandkitBuild
  )
  .command(
    'brandkit:import',
    'Import brand kit modules (brand_voice, icps, usps, …)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('json', { type: 'string', description: 'Path to JSON file with module data' })
        .option('data', { type: 'string', description: 'Inline JSON module data (alternative to --json)' })
        .example('$0 brandkit:import --brand <id> --json modules.json', 'Import modules from a file'),
    brandkitImport
  )

  // ── Brand Context Documents ──────────────────────────────────────────────────
  .command(
    'brandkit:context-list',
    'List context documents linked to a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('canonical-key', { type: 'string', description: 'Filter by canonical type key (e.g. brand_voice)' })
        .option('search', { type: 'string', description: 'Search by document name or type' })
        .option('ordering', {
          type: 'string',
          choices: ['created', '-created', 'modified', '-modified'] as const,
          description: 'Sort order (default: -modified)',
        }),
    contextList
  )
  .command(
    'brandkit:context-create',
    'Create or link a context document on a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('document-id', { type: 'string', description: 'Link an existing KnowledgeDoc by UUID' })
        .option('doc-type', { type: 'string', description: 'Type key for inline creation (e.g. brand_voice)' })
        .option('name', { type: 'string', description: 'Document name (inline creation)' })
        .option('description', { type: 'string', description: 'Document description' })
        .option('content', { type: 'string', description: 'Markdown content (inline)' })
        .option('content-file', { type: 'string', description: 'Path to a markdown file (alternative to --content)' })
        .option('data', { type: 'string', description: 'Inline JSON structured data' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 brandkit:context-create --brand <id> --doc-type brand_voice --name "Voice" --content-file voice.md', 'Inline creation')
        .example('$0 brandkit:context-create --brand <id> --document-id <docId>', 'Link an existing doc'),
    contextCreate
  )
  .command(
    'brandkit:context-update',
    'Update a linked context document',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('link', { type: 'string', description: 'Context document link UUID', demandOption: true })
        .option('name', { type: 'string', description: 'New document name' })
        .option('description', { type: 'string', description: 'New description' })
        .option('content', { type: 'string', description: 'New markdown content (inline)' })
        .option('content-file', { type: 'string', description: 'Path to a markdown file (alternative to --content)' })
        .option('data', { type: 'string', description: 'Inline JSON structured data' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' }),
    contextUpdate
  )
  .command(
    'brandkit:context-delete',
    'Delete a context document link from a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('link', { type: 'string', description: 'Context document link UUID', demandOption: true }),
    contextDelete
  )
  .command(
    'brandkit:context-get',
    'Get a single context document by its canonical type',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('type', {
          type: 'string',
          choices: CONTEXT_TYPES,
          description: 'Canonical type key',
          demandOption: true,
        }),
    contextGet
  )
```

- [ ] **Step 4: Build and smoke-test**

Run:
```bash
nvm use 22 && npm run build
node dist/index.js brandkit:list --help
node dist/index.js brandkit:context-get --help
node dist/index.js brandkit:build --help
```
Expected: build succeeds; each `--help` prints the command's options (confirming required
flags and `choices` for `--type`/`--ordering`).

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat(cli): register brand kit and context commands"
```

---

## Task 9: Project handlers (`projects.ts` — 5 commands)

**Files:**
- Create: `src/commands/projects.ts`

- [ ] **Step 1: Implement the 5 project handlers**

Create `src/commands/projects.ts`:

```ts
import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';
import { loadJsonBody, parseList } from './_shared';

async function run(action: string, fn: (api: SimplifiedAPI) => Promise<unknown>): Promise<void> {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await fn(api);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to ${action}: ${msg}`);
    process.exit(1);
  }
}

export async function projectsList(args: {
  type: string;
  'primary-type'?: string;
  ordering?: string;
  search?: string;
}) {
  await run('list projects', (api) =>
    api.listProjects(args.type, {
      primary_type: args['primary-type'],
      ordering: args.ordering,
      search: args.search,
    })
  );
}

export async function projectsCreate(args: {
  type: string;
  title?: string;
  description?: string;
  'primary-type'?: string;
  data?: string;
  json?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const overrides: Record<string, unknown> = {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args['primary-type'] !== undefined && { primary_type: args['primary-type'] }),
      ...(args.data && { data: loadJsonBody({ data: args.data }) }),
    };
    const body = args.json ? loadJsonBody({ json: args.json }, overrides) : overrides;
    const result = await api.createProject(args.type, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create project: ${msg}`);
    process.exit(1);
  }
}

export async function projectsGet(args: { type: string; id: string }) {
  await run('get project', (api) => api.getProject(args.type, args.id));
}

export async function projectsDelete(args: { type: string; id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await api.deleteProject(args.type, args.id);
    console.log('✅ Project deleted');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to delete project: ${msg}`);
    process.exit(1);
  }
}

export async function projectsExport(args: {
  type: string;
  project: string;
  'partner-id': number;
  'item-ids': string;
}) {
  await run('export project items', (api) =>
    api.exportProjectItems(args.type, args.project, {
      partner_id: args['partner-id'],
      item_ids: parseList(args['item-ids']),
    })
  );
}
```

- [ ] **Step 2: Build to confirm types**

Run: `nvm use 22 && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/commands/projects.ts
git commit -m "feat(commands): add project handlers"
```

---

## Task 10: Project Item handlers (append to `projects.ts` — 6 commands)

**Files:**
- Modify: `src/commands/projects.ts` (append)

- [ ] **Step 1: Implement the 6 item handlers**

Append to `src/commands/projects.ts`:

```ts
export async function itemList(args: {
  type: string;
  project: string;
  'primary-type'?: string;
  ordering?: string;
  search?: string;
}) {
  await run('list project items', (api) =>
    api.listProjectItems(args.type, args.project, {
      primary_type: args['primary-type'],
      ordering: args.ordering,
      search: args.search,
    })
  );
}

export async function itemCreate(args: {
  type: string;
  project: string;
  title?: string;
  description?: string;
  'primary-type'?: string;
  data?: string;
  json?: string;
  'start-date'?: string;
  'due-date'?: string;
  status?: string;
  priority?: number;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const overrides: Record<string, unknown> = {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args['primary-type'] !== undefined && { primary_type: args['primary-type'] }),
      ...(args.data && { data: loadJsonBody({ data: args.data }) }),
      ...(args['start-date'] !== undefined && { start_date: args['start-date'] }),
      ...(args['due-date'] !== undefined && { due_date: args['due-date'] }),
      ...(args.status !== undefined && { status: args.status }),
      ...(args.priority !== undefined && { priority: args.priority }),
    };
    const body = args.json ? loadJsonBody({ json: args.json }, overrides) : overrides;
    const result = await api.createProjectItem(args.type, args.project, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create project item: ${msg}`);
    process.exit(1);
  }
}

export async function itemGet(args: { type: string; project: string; id: string }) {
  await run('get project item', (api) => api.getProjectItem(args.type, args.project, args.id));
}

export async function itemDelete(args: { type: string; project: string; id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await api.deleteProjectItem(args.type, args.project, args.id);
    console.log('✅ Project item deleted');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to delete project item: ${msg}`);
    process.exit(1);
  }
}

export async function itemAssignAgent(args: { type: string; project: string; id: string; 'agent-id': string }) {
  await run('assign agent to item', (api) =>
    api.assignAgentToItem(args.type, args.project, args.id, { agent_id: args['agent-id'] })
  );
}

export async function itemReorder(args: { type: string; project: string; id: string; position: number }) {
  await run('reorder project item', (api) =>
    api.reorderProjectItem(args.type, args.project, args.id, { position: args.position })
  );
}
```

- [ ] **Step 2: Build to confirm types**

Run: `nvm use 22 && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/commands/projects.ts
git commit -m "feat(commands): add project item handlers"
```

---

## Task 11: Register Project + Item commands in `index.ts`

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add the import**

After the brandkit import block (added in Task 8), add:

```ts
import {
  projectsList,
  projectsCreate,
  projectsGet,
  projectsDelete,
  projectsExport,
  itemList,
  itemCreate,
  itemGet,
  itemDelete,
  itemAssignAgent,
  itemReorder,
} from './commands/projects';
```

- [ ] **Step 2: Register the 11 commands**

After the `brandkit:context-get` command (from Task 8), before `.demandCommand`, insert:

```ts
  // ── Projects ──────────────────────────────────────────────────────────────
  .command(
    'projects:list',
    'List projects of a given resourcetype',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype (e.g. pm, blogger, ad)', demandOption: true })
        .option('primary-type', { type: 'string', description: 'Filter by primary type' })
        .option('ordering', { type: 'string', description: 'Field to order results by' })
        .option('search', { type: 'string', description: 'Search term' })
        .example('$0 projects:list --type blogger', 'List blogger projects'),
    projectsList
  )
  .command(
    'projects:create',
    'Create a project of a given resourcetype',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('title', { type: 'string', description: 'Project title' })
        .option('description', { type: 'string', description: 'Project description' })
        .option('primary-type', { type: 'string', description: 'Project category string' })
        .option('data', { type: 'string', description: 'Inline JSON for the project data field' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 projects:create --type pm --title "Q3 Campaign"', 'Create a project'),
    projectsCreate
  )
  .command(
    'projects:get',
    'Get a project by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('id', { type: 'string', description: 'Project id', demandOption: true }),
    projectsGet
  )
  .command(
    'projects:delete',
    'Soft-delete a project by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('id', { type: 'string', description: 'Project id', demandOption: true }),
    projectsDelete
  )
  .command(
    'projects:export',
    'Export project items to a partner integration',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Project id', demandOption: true })
        .option('partner-id', { type: 'number', description: 'Partner integration id', demandOption: true })
        .option('item-ids', { type: 'string', description: 'Comma-separated ProjectItem UUIDs', demandOption: true })
        .example('$0 projects:export --type pm --project <id> --partner-id 123 --item-ids "uuid1,uuid2"', 'Export items'),
    projectsExport
  )

  // ── Project Items ─────────────────────────────────────────────────────────
  .command(
    'projects:item-list',
    'List items within a project',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('primary-type', { type: 'string', description: 'Filter by primary type' })
        .option('ordering', { type: 'string', description: 'Field to order results by' })
        .option('search', { type: 'string', description: 'Search term' }),
    itemList
  )
  .command(
    'projects:item-create',
    'Create an item within a project',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('title', { type: 'string', description: 'Item title' })
        .option('description', { type: 'string', description: 'Item description' })
        .option('primary-type', { type: 'string', description: 'Item category string' })
        .option('data', { type: 'string', description: 'Inline JSON for the item data field' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .option('start-date', { type: 'string', description: 'Start date (ISO 8601)' })
        .option('due-date', { type: 'string', description: 'Due date (ISO 8601)' })
        .option('status', { type: 'string', description: 'Status string (max 16 chars)' })
        .option('priority', { type: 'number', description: 'Priority level (default 0)' }),
    itemCreate
  )
  .command(
    'projects:item-get',
    'Get a project item by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true }),
    itemGet
  )
  .command(
    'projects:item-delete',
    'Soft-delete a project item by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true }),
    itemDelete
  )
  .command(
    'projects:item-assign-agent',
    'Assign an AI agent to a project item',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true })
        .option('agent-id', { type: 'string', description: 'Agent (Chatbot) UUID', demandOption: true }),
    itemAssignAgent
  )
  .command(
    'projects:item-reorder',
    'Move a project item to a new position',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true })
        .option('position', { type: 'number', description: 'New position index', demandOption: true }),
    itemReorder
  )
```

- [ ] **Step 3: Build and smoke-test all commands**

Run:
```bash
nvm use 22 && npm run build
for c in brandkit:list brandkit:create brandkit:get brandkit:brandbook brandkit:build \
  brandkit:import brandkit:context-list brandkit:context-create brandkit:context-update \
  brandkit:context-delete brandkit:context-get projects:list projects:create projects:get \
  projects:delete projects:export projects:item-list projects:item-create projects:item-get \
  projects:item-delete projects:item-assign-agent projects:item-reorder; do
  echo "=== $c ==="; node dist/index.js "$c" --help >/dev/null && echo OK || echo "FAIL: $c";
done
```
Expected: every command prints `OK` (yargs parses each command definition without error).

- [ ] **Step 4: Run the full test suite**

Run: `nvm use 22 && npx vitest run`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat(cli): register project and item commands"
```

---

## Task 12: Skill & reference docs

**Files:**
- Create: `skills/simplified-cli/references/BRAND_KIT.md`
- Create: `skills/simplified-cli/references/PROJECTS.md`
- Modify: `skills/simplified-cli/SKILL.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Read the existing skill files to match tone/structure**

Run:
```bash
sed -n '1,80p' skills/simplified-cli/SKILL.md
sed -n '1,40p' skills/simplified-cli/references/IMAGE_TOOLS.md
sed -n '1,30p' README.md
sed -n '1,20p' CHANGELOG.md
```
Expected: see the heading style, the command-table format, and the `[Unreleased]` section
so the new docs match exactly.

- [ ] **Step 2: Create `references/BRAND_KIT.md`**

Create `skills/simplified-cli/references/BRAND_KIT.md` covering, in the same style as the
existing reference files:
- The 6 brand-kit commands + 5 context commands with their flags (copy from Task 8 registration).
- The `context_type` list (16 values) for `brandkit:context-get --type`.
- The `brandbook --elements` catalogue (17 values: voices, colors, fonts, logos, cover,
  description, social_links, assets, videos, knowledge, captions, brief, comprehensive,
  brand_icps, usps, products, competitors, content_pillars).
- The onboarding flow: `brandkit:create` → `brandkit:import` (or `brandkit:build`) → `brandkit:brandbook`.
- A worked `brandkit:build` example (a small `style.json` with colors + typography) and a
  `brandkit:import` example (a `modules.json` with `brand_voice` + `icps`), reusing the
  example bodies from the OpenAPI spec.
- Note the `--json`/`--data` mutual exclusion and `--content`/`--content-file` rule.

- [ ] **Step 3: Create `references/PROJECTS.md`**

Create `skills/simplified-cli/references/PROJECTS.md` covering:
- The 5 project + 6 item commands with their flags (copy from Task 11 registration).
- An explanation of the polymorphic `resourcetype` (`--type`): free-form; known values
  `pm`, `blogger`, `ad`, `campaign`, `SMQuotes`, `AIAvatarVideo`, etc. The CLI forwards it
  as-is; inspect a `projects:list` response to discover valid fields per type.
- The flag rule: `--type` = resourcetype, `--project` = parent, `--id` = target resource.
- A worked `projects:create` + `projects:item-create` example, then `projects:export`.

- [ ] **Step 4: Update `SKILL.md`**

Add two new sections to `skills/simplified-cli/SKILL.md` (matching the existing per-area
sections), each with a one-line description, the command list, and a pointer to the
reference file:
- "Brand Kits & Brand Context" → `references/BRAND_KIT.md`
- "Projects & Items" → `references/PROJECTS.md`

- [ ] **Step 5: Update `README.md`**

Add the 22 commands to the README command listing, following the existing grouping/format.

- [ ] **Step 6: Update `CHANGELOG.md`**

Under `[Unreleased]`, add an `### Added` entry:

```markdown
### Added
- **Brand Kits**: `brandkit:list`, `brandkit:create`, `brandkit:get`, `brandkit:brandbook`,
  `brandkit:build`, `brandkit:import`.
- **Brand Context Documents**: `brandkit:context-list`, `brandkit:context-create`,
  `brandkit:context-update`, `brandkit:context-delete`, `brandkit:context-get`.
- **Projects & Items**: `projects:list`, `projects:create`, `projects:get`,
  `projects:delete`, `projects:export`, and `projects:item-{list,create,get,delete,assign-agent,reorder}`.
- Test runner (`vitest`) with unit coverage for the input helpers and `request()` 204 handling.
```

- [ ] **Step 7: Build + full test run + final smoke**

Run:
```bash
nvm use 22 && npm run build && npx vitest run && node dist/index.js --help | head -40
```
Expected: build succeeds, all tests pass, `--help` lists the new commands.

- [ ] **Step 8: Commit**

```bash
git add skills/simplified-cli/ README.md CHANGELOG.md
git commit -m "docs(skill): document brand kit, context and project commands"
```

---

## Self-review checklist (completed during planning)

**Spec coverage** — every spec section maps to a task:
- §3 layers → Tasks 4–11; §3.1 `request()` 204 → Task 2.
- §4 catalog: brand kit (Task 6/8), context (Task 7/8), projects (Task 9/11), items (Task 10/11).
- §5 input hybrid → Task 3 helpers, used by handlers in Tasks 6–10.
- §6 vitest variant B → Tasks 1 (setup), 2 (api 204), 3 (helpers), 4 (api URL/query).
- §7 docs → Task 12.

**Type/name consistency** — handler arg keys use yargs hyphenated names (`'content-file'`,
`'partner-id'`, `'agent-id'`, `'item-ids'`, `'primary-type'`, `'start-date'`, `'due-date'`);
API method names match between definition (Tasks 2/4/5) and handler calls (Tasks 6/7/9/10);
`loadJsonBody`/`readContent`/`requireXor`/`parseList` signatures match Task 3.

**Out of scope (not planned, by design):** subsystems D (media V2, voices/audio) and E
(get-workspace, create-document, create-asset, get-task) — separate future cycles.
