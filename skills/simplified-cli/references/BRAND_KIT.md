# Brand Kits & Brand Context Reference

Manage brand kits and linked context documents. Brand kits store colors, fonts, logos, voice, and other brand assets. Context documents attach structured knowledge (brand voice, ICPs, SEO guidelines, etc.) to a brand kit for use in AI-driven content generation.

---

## Brand Kit Commands

### `brandkit:list`

List brand kits in the workspace.

```bash
simplified brandkit:list
simplified brandkit:list --search "Velle"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--search` | string | No | Filter brand kits by title |

---

### `brandkit:create`

Create a new brand kit. Only `--title` is required unless `--json` is used.

```bash
simplified brandkit:create --title "Velle Studio"

# With full body from a file
simplified brandkit:create --json brand.json
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--title` | string | Yes (unless `--json`) | Brand name |
| `--description` | string | No | Short brand description |
| `--social-links` | string | No | JSON array of `{type, url}` link objects |
| `--json` | string | No | Path to JSON file with the full body |

---

### `brandkit:get`

Get a brand kit by UUID.

```bash
simplified brandkit:get --brand <uuid>
simplified brandkit:get --brand <uuid> --expand extra,website
simplified brandkit:get --brand <uuid> --fields "title,colors" --omit "fonts"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--expand` | string | No | Comma-separated expansions: `extra`, `website` |
| `--fields` | string | No | Comma-separated top-level keys to include |
| `--omit` | string | No | Comma-separated top-level keys to exclude |

---

### `brandkit:brandbook`

Get brand book data — an AI-optimized view of the brand kit. Omit `--elements` for base data only.

```bash
simplified brandkit:brandbook --brand <uuid>
simplified brandkit:brandbook --brand <uuid> --elements "brief,voices,colors,fonts"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--elements` | string | No | Comma-separated elements to include (see catalogue below) |

**`--elements` catalogue (17 values):**

`voices` · `colors` · `fonts` · `logos` · `cover` · `description` · `social_links` · `assets` · `videos` · `knowledge` · `captions` · `brief` · `comprehensive` · `brand_icps` · `usps` · `products` · `competitors` · `content_pillars`

---

### `brandkit:build`

Populate a brand kit with a canonical `BrandKitDocument` containing brand metadata, social links, and style (colors, typography, etc.). Use `--json` or `--data` — not both.

```bash
# Build from a file
simplified brandkit:build --brand <uuid> --json style.json

# Build from an inline JSON string
simplified brandkit:build --brand <uuid> --data '{"brand":{"name":"Velle"},"style":{"colors":{"primary":[{"hex":"#E63946","name":"Red","role":"primary"}]}}}'
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--json` | string | XOR `--data` | Path to JSON file with the document body |
| `--data` | string | XOR `--json` | Inline JSON document body |

**Example `style.json`:**

```json
{
  "brand": {
    "name": "Velle Studio",
    "tagline": "Design without limits"
  },
  "style": {
    "colors": {
      "primary": [
        { "hex": "#E63946", "name": "Signal Red", "role": "primary" },
        { "hex": "#1D3557", "name": "Navy", "role": "secondary" }
      ],
      "neutral": [
        { "hex": "#F1FAEE", "name": "Off-White", "role": "background" }
      ]
    },
    "typography": {
      "headline": { "family": "Playfair Display", "weights": [700, 900] },
      "body": { "family": "Inter", "weights": [400, 500] }
    }
  }
}
```

Each color token shape: `{ "hex": string, "name": string, "role": string }`.

---

### `brandkit:import`

Import brand kit modules (brand_voice, icps, usps, and others). Use `--json` or `--data` — not both.

```bash
# Import from a file
simplified brandkit:import --brand <uuid> --json modules.json

# Import inline
simplified brandkit:import --brand <uuid> --data '{"brand_voice":{...}}'
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--json` | string | XOR `--data` | Path to JSON file with module data |
| `--data` | string | XOR `--json` | Inline JSON module data |

**Example `modules.json`:**

```json
{
  "brand_voice": {
    "brand_voice_characteristics": [
      { "name": "Confident", "description": "Speak directly; avoid hedging language." },
      { "name": "Playful", "description": "Use light humour and emojis where appropriate." }
    ]
  },
  "icps": {
    "ideal_customer_profiles": [
      {
        "name": "Growth-stage SaaS founder",
        "age_range": "28-45",
        "pain_points": ["limited marketing bandwidth", "fast hiring cycles"],
        "goals": ["scale content output", "build brand authority"]
      }
    ]
  }
}
```

---

## Brand Context Document Commands

Context documents attach structured knowledge to a brand kit (e.g. brand voice, SEO guidelines, ICPs). They are stored as `KnowledgeDoc` records and linked to the brand kit.

### `brandkit:context-list`

List context documents linked to a brand kit.

```bash
simplified brandkit:context-list --brand <uuid>
simplified brandkit:context-list --brand <uuid> --canonical-key brand_voice
simplified brandkit:context-list --brand <uuid> --ordering -modified
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--canonical-key` | string | No | Filter by canonical type key (e.g. `brand_voice`) |
| `--search` | string | No | Search by document name or type |
| `--ordering` | `created` \| `-created` \| `modified` \| `-modified` | No | Sort order (default: `-modified`) |

---

### `brandkit:context-create`

Create or link a context document on a brand kit.

**Two modes (mutually exclusive):**

- **Link an existing doc:** provide `--document-id`.
- **Inline creation:** provide `--doc-type` + `--name` (and optionally `--content` or `--content-file`).

```bash
# Inline creation with a markdown file
simplified brandkit:context-create \
  --brand <uuid> \
  --doc-type brand_voice \
  --name "Brand Voice" \
  --content-file voice.md

# Link an existing KnowledgeDoc
simplified brandkit:context-create --brand <uuid> --document-id <docUUID>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--document-id` | string | XOR (`--doc-type` + `--name`) | Link an existing KnowledgeDoc by UUID |
| `--doc-type` | string | XOR `--document-id` | Type key for inline creation (e.g. `brand_voice`) |
| `--name` | string | with `--doc-type` | Document name (inline creation) |
| `--description` | string | No | Document description |
| `--content` | string | XOR `--content-file` | Markdown content (inline) |
| `--content-file` | string | XOR `--content` | Path to a markdown file |
| `--data` | string | No | Inline JSON structured data |
| `--json` | string | No | Path to JSON file with the full body |

---

### `brandkit:context-update`

Update a linked context document.

```bash
simplified brandkit:context-update \
  --brand <uuid> \
  --link <linkUUID> \
  --content-file updated-voice.md
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--link` | string | Yes | Context document link UUID |
| `--name` | string | No | New document name |
| `--description` | string | No | New description |
| `--content` | string | XOR `--content-file` | New markdown content (inline) |
| `--content-file` | string | XOR `--content` | Path to a markdown file |
| `--data` | string | No | Inline JSON structured data |
| `--json` | string | No | Path to JSON file with the full body |

---

### `brandkit:context-delete`

Delete a context document link from a brand kit.

```bash
simplified brandkit:context-delete --brand <uuid> --link <linkUUID>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--link` | string | Yes | Context document link UUID |

---

### `brandkit:context-get`

Get a single context document by its link UUID. The `--link` value may be either the
context-document link UUID (the `BrandKitContextDocument` junction id returned by
`brandkit:context-list`) OR the underlying KnowledgeDoc UUID — the server resolves either form.

```bash
simplified brandkit:context-get --brand <uuid> --link <linkUUID>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--link` | string | Yes | Context document link UUID or underlying KnowledgeDoc UUID |

---

### `brandkit:context-get-by-type`

Get a single context document by its canonical type.

```bash
simplified brandkit:context-get-by-type --brand <uuid> --type brand_voice
simplified brandkit:context-get-by-type --brand <uuid> --type seo_guidelines
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--brand` | string | Yes | Brand kit UUID |
| `--type` | string | Yes | Canonical type key (see values below) |

**`--type` values (16):**

`brand_voice` · `style_guide` · `seo_guidelines` · `internal_links` · `target_keywords` · `features` · `competitor_analysis` · `writing_examples` · `cro_best_practices` · `company_research` · `brand_profile` · `market_positioning` · `icps` · `usps` · `content_pillars` · `marketing_strategy`

---

## Onboarding Flow

```bash
# 1. Create a brand kit — note the returned id
simplified brandkit:create --title "Velle Studio"
# → { "id": "<brandUUID>", ... }

# 2a. Populate brand metadata + style with a canonical document
simplified brandkit:build --brand <brandUUID> --json style.json

# 2b. OR import structured modules (brand_voice, icps, usps, …)
simplified brandkit:import --brand <brandUUID> --json modules.json

# 3. Attach a context document (brand voice as markdown)
simplified brandkit:context-create \
  --brand <brandUUID> \
  --doc-type brand_voice \
  --name "Brand Voice" \
  --content-file voice.md

# 4. Verify — retrieve the full brand book
simplified brandkit:brandbook --brand <brandUUID> \
  --elements "brief,voices,colors,fonts,logos,usps,brand_icps"
```

**Input rules:**
- `--json <file>` XOR `--data '<json>'` — never both.
- `--content` XOR `--content-file` — never both.
- For `brandkit:context-create`: either `--document-id` OR (`--doc-type` + `--name`).
