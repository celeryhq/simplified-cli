# Brand Kits, Context Documents & Projects — CLI design

**Date:** 2026-06-09
**Status:** Approved (pending spec review)
**Scope:** Add CLI commands + skill docs for the Brand Kit / Context Document / Projects
subsystems of the Simplified apikit API (OpenAPI "Brand Kit & Projects API" v1.1.0).

## 1. Goal & scope

Add 22 commands covering three related subsystems, plus skill/reference docs and a
narrow unit-test layer (vitest).

In scope:

- **A. Brand Kits** — list, create, get, brandbook, build (V2), import-modules.
- **B. Context Documents** (nested under a brand kit) — list, create, update, delete, get-by-type.
- **C. Projects & Items** — projects (list, create, get, delete, export-items) and
  items (list, create, get, delete, assign-agent, reorder).

Explicitly **out of scope** (separate later cycles):

- **D. Media V2** — `generate-image-v2`, `generate-video-v2` (+ poll + `model-fields`),
  `convert-image-format`, `voices`, `generate-audio`. Several duplicate existing
  `ai-image:*` / `image:convert` commands on new paths — needs a "migrate vs coexist" decision.
- **E. Misc** — `get-workspace`, `create-document`, `create-asset` (already covered by
  `assets:import`), `get-task` (already covered by existing polling).

## 2. Key facts about the codebase

- The apikit endpoints live on the **same host** the CLI already targets:
  `apiUrl` defaults to `https://api.simplified.com` (`src/config.ts:145`). They use
  `/api/v1/...` and `/api/v2/...` paths (vs the existing `/api/v1/service/...`).
- `SimplifiedAPI.request<T>()` (`src/api.ts:125`) already handles arbitrary methods,
  query params (arrays → repeated params), the `Authorization: Api-Key` header, and the
  `Space` (teamspace) header. New methods reuse it unchanged **except** the 204 fix below.
- Auth + teamspace are global and inherited: the yargs middleware (`src/index.ts:120`)
  sets `--api-key` / `--teamspace` overrides; `getConfig()` resolves them. New commands
  need no auth-specific code.
- Command convention is strict `area:verb` (one colon; multi-word verb hyphenated, e.g.
  `posts:list-drafts`). Nested resources are expressed via hyphenated verbs + a parent flag.
- Skills live in `skills/simplified-cli/SKILL.md` + `references/*.md` (one reference file
  per area). The skill ships via the plugin marketplace, not the npm tarball.
- There is currently **no test framework** in the repo.

## 3. Architecture (three layers, unchanged pattern)

- **`src/api.ts`** — 22 new methods on `SimplifiedAPI`, all delegating to `request<T>()`.
- **`src/commands/brandkit.ts`** — 11 handlers (6 brand kit + 5 context document).
- **`src/commands/projects.ts`** — 11 handlers (5 project + 6 item).
- **`src/commands/_shared.ts`** (new) — pure, testable input helpers (see §6).
- **`src/index.ts`** — register 22 yargs commands.

### 3.1 Required change to `request()`

`DELETE` endpoints return `204 No Content`. The current `request()` ends with
`return response.json()`, which throws on an empty body. Change: when the response is
`204` or has an empty body, return `undefined` instead of parsing. This is the only edit
to shared code and is covered by a regression test (§6).

## 4. Command catalog (22)

Flag convention (one consistent rule across the subsystem):

- `--type` = the polymorphic `resourcetype` (always required for `projects:*`).
- `--project` = parent project id (for `item-*` commands).
- `--id` = the id of the resource the command acts on (project for `projects:get/delete`;
  item for `item-get/delete/assign-agent/reorder`).
- `--brand` = brand kit UUID.
- `--link` = context-document link id (`BrandKitContextDocument` id).

### Brand Kits

| Command | Method + path | Flags |
|---|---|---|
| `brandkit:list` | `GET /api/v2/brandkits` | `--search` |
| `brandkit:create` | `POST /api/v1/brandkit` | `--title`*, `--description`, `--social-links '<json>'`, `--json <file>` |
| `brandkit:get` | `GET /api/v2/brandkits/{brand_id}` | `--brand`*, `--expand`, `--fields`, `--omit` |
| `brandkit:brandbook` | `GET /api/v1/brandkit/{brand_id}/brandbook` | `--brand`*, `--elements` |
| `brandkit:build` | `POST /api/v2/brandkits/{brand_id}/build` | `--brand`*, (`--json <file>` \| `--data '<json>'`) |
| `brandkit:import` | `PATCH /api/v1/brandkit/{brand_id}/import-modules` | `--brand`*, (`--json <file>` \| `--data '<json>'`) |

- `brandkit:create` body: `{ title, extra?: { description?, social_links? } }`.
  `--social-links` takes a JSON array string.
- `brandkit:build` / `brandkit:import` bodies are the full document (`BrandKitDocument` /
  `BrandKitImportRequest`); `--json` and `--data` are interchangeable and mutually exclusive.
- `brandkit:build` also prints `warnings[]` from the response when present.

### Context Documents (nested under a brand kit)

| Command | Method + path | Flags |
|---|---|---|
| `brandkit:context-list` | `GET .../brandkit/{brand_id}/context-documents` | `--brand`*, `--canonical-key`, `--search`, `--ordering` |
| `brandkit:context-create` | `POST .../context-documents` | `--brand`*, `--document-id` \| (`--doc-type` + `--name`), `--description`, (`--content` \| `--content-file`), `--data '<json>'`, `--json <file>` |
| `brandkit:context-update` | `PATCH .../context-documents/{document_link_id}` | `--brand`*, `--link`*, `--name`, `--description`, (`--content` \| `--content-file`), `--data '<json>'`, `--json <file>` |
| `brandkit:context-delete` | `DELETE .../context-documents/{document_link_id}` | `--brand`*, `--link`* |
| `brandkit:context-get` | `GET .../context-documents/by-type/{context_type}` | `--brand`*, `--type`* |

- `--ordering` choices: `created`, `-created`, `modified`, `-modified` (default `-modified`).
- `context-create` requires `--document-id` **XOR** (`--doc-type` + `--name`).
- `--type` (context-get) validated via yargs `choices` against the 16-value enum:
  `brand_voice, style_guide, seo_guidelines, internal_links, target_keywords, features,
  competitor_analysis, writing_examples, cro_best_practices, company_research,
  brand_profile, market_positioning, icps, usps, content_pillars, marketing_strategy`.

### Projects

| Command | Method + path | Flags |
|---|---|---|
| `projects:list` | `GET /api/v1/projects/{resourcetype}` | `--type`*, `--primary-type`, `--ordering`, `--search` |
| `projects:create` | `POST /api/v1/projects/{resourcetype}` | `--type`*, `--title`, `--description`, `--primary-type`, `--data '<json>'`, `--json <file>` |
| `projects:get` | `GET /api/v1/projects/{resourcetype}/{id}` | `--type`*, `--id`* |
| `projects:delete` | `DELETE /api/v1/projects/{resourcetype}/{id}` | `--type`*, `--id`* |
| `projects:export` | `POST .../{id}/export-items` | `--type`*, `--project`*, `--partner-id`* (number), `--item-ids`* (comma list) |

### Project Items (nested under a project)

| Command | Method + path | Flags |
|---|---|---|
| `projects:item-list` | `GET .../{project_id}/items` | `--type`*, `--project`*, `--primary-type`, `--ordering`, `--search` |
| `projects:item-create` | `POST .../{project_id}/items` | `--type`*, `--project`*, `--title`, `--description`, `--primary-type`, `--data '<json>'`, `--json <file>`, `--start-date`, `--due-date`, `--status`, `--priority` (number) |
| `projects:item-get` | `GET .../items/{id}` | `--type`*, `--project`*, `--id`* |
| `projects:item-delete` | `DELETE .../items/{id}` | `--type`*, `--project`*, `--id`* |
| `projects:item-assign-agent` | `POST .../items/{id}/assign-agent` | `--type`*, `--project`*, `--id`*, `--agent-id`* |
| `projects:item-reorder` | `POST .../items/{id}/reorder` | `--type`*, `--project`*, `--id`*, `--position`* (number) |

(`*` = required.)

## 5. Data input (hybrid)

- Simple scalars → dedicated flags.
- Heavy body (`build`, `import`) → `--json <file>` **or** `--data '<json>'`
  (mutually exclusive; both → error).
- Flexible `data` object (projects/items/context) → `--data '<json>'` fills the `.data`
  key; `--json <file>` supplies a full body that scalar flags then override.
- Markdown content (context) → `--content '<text>'` **or** `--content-file <path>`
  (mutually exclusive).

Output/error parity with the rest of the CLI: success →
`console.log(JSON.stringify(result, null, 2))`; error → `console.error('❌ …')` +
`process.exit(1)`. `DELETE` (204, no body) → `✅ Deleted`.

## 6. Testable helpers (`src/commands/_shared.ts`) + tests

All non-trivial logic lives in pure helpers so it is unit-testable without network or
`process.exit` mocking. Handlers stay thin glue.

- `loadJsonBody({ json?, data?, ...scalars })` — resolves the body from a file or inline
  string, applies scalar overrides, enforces `--json` XOR `--data`. Returns a plain object.
- `readContent(text?, file?)` — resolves markdown from inline or file, enforces mutual
  exclusion.
- `requireXor(...)` / validation helpers used by `context-create`.

### Testing — variant B (vitest, narrow)

Add vitest with **no config file** (uses existing `tsconfig.json`). Cover only the two
places with real logic; leave handler e2e to `--help` smoke tests.

- `package.json`: add `"test": "vitest run"` (+ `"test:watch": "vitest"`) and
  `vitest` to `devDependencies`.
- **`src/commands/_shared.test.ts`** — precedence (scalar flags override `--json` file),
  `--json`/`--data` mutual exclusion, `--content`/`--content-file` mutual exclusion,
  `context-create` document-id XOR doc-type+name.
- **`src/api.test.ts`** — mock `fetch`; assert URL/query construction (e.g. `getBrandKit`
  expand encoding), `Space` header injection, and the **204 → `undefined`** regression on
  `request()`.

Out of test scope (variant B): per-handler e2e. Verified instead by `npm run build`
(typecheck) and `node dist/index.js <cmd> --help` smoke tests per command.

## 7. Docs & release

- New reference files: `references/BRAND_KIT.md` (brand kit + context: `context_type`
  list, brandbook `elements`, `build`/`import` examples) and `references/PROJECTS.md`
  (projects + items: polymorphic `resourcetype` explained).
- Update `SKILL.md` (command sections + when-to-use), `README.md` (command list),
  `CHANGELOG.md` (`[Unreleased]`).
- Version bump (4 locations + plugin) per the `ROADMAP.md` release checklist — at release time.

## 8. Risks / open notes

- `extract_ref` in `BrandKitDocument` is consumed by the apikit pre-hook, not forwarded —
  the CLI just passes whatever JSON the user supplies; no special handling.
- `resourcetype` is free-form and polymorphic; the CLI does not enumerate valid values —
  it forwards `--type` as-is. Reference docs list known values (`pm`, `blogger`, `ad`, …).
- The 204 change to `request()` touches a path shared by all existing commands — covered
  by the regression test in §6.
