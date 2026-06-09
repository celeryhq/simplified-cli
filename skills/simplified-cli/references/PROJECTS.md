# Projects & Items Reference

Manage content projects and their items. A **project** is a container for a set of related items (e.g. blog posts, ad campaigns, social media content). An **item** is an individual piece of work inside a project.

The project type (`--type`) is a polymorphic `resourcetype` selector that tells the API which content model to use. The CLI forwards it as-is — the API returns model-specific fields per type.

**Known `--type` values:** `pm` · `blogger` · `ad` · `campaign` · `blog` · `SMQuotes` · `AIAvatarVideo` · `AiProductVideos` · `UGCVideo` · `ImageYTThumb`

Run `projects:list --type <type>` and inspect the response to discover the fields available for each type.

---

## Project Commands

### `projects:list`

List projects of a given resourcetype.

```bash
simplified projects:list --type pm
simplified projects:list --type blogger --search "Q3"
simplified projects:list --type ad --ordering -created
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype (e.g. `pm`, `blogger`, `ad`) |
| `--primary-type` | string | No | Filter by primary type |
| `--ordering` | string | No | Field to order results by |
| `--search` | string | No | Search term |

---

### `projects:create`

Create a project of a given resourcetype.

```bash
simplified projects:create --type pm --title "Q3 Campaign"
simplified projects:create --type blogger --title "Blog Series" --description "Monthly how-to articles"
simplified projects:create --type pm --json project.json
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--title` | string | No | Project title |
| `--description` | string | No | Project description |
| `--primary-type` | string | No | Project category string |
| `--data` | string | No | Inline JSON for the project `data` field |
| `--json` | string | No | Path to JSON file with the full body |

---

### `projects:get`

Get a project by id.

```bash
simplified projects:get --type pm --id <projectId>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--id` | string | Yes | Project id |

---

### `projects:delete`

Soft-delete a project by id.

```bash
simplified projects:delete --type pm --id <projectId>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--id` | string | Yes | Project id |

---

### `projects:export`

Export project items to a partner integration.

```bash
simplified projects:export \
  --type pm \
  --project <projectId> \
  --partner-id 123 \
  --item-ids "uuid1,uuid2,uuid3"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Project id |
| `--partner-id` | number | Yes | Partner integration id |
| `--item-ids` | string | Yes | Comma-separated ProjectItem UUIDs |

---

## Project Item Commands

### `projects:item-list`

List items within a project.

```bash
simplified projects:item-list --type pm --project <projectId>
simplified projects:item-list --type blogger --project <projectId> --search "intro"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--primary-type` | string | No | Filter by primary type |
| `--ordering` | string | No | Field to order results by |
| `--search` | string | No | Search term |

---

### `projects:item-create`

Create an item within a project.

```bash
simplified projects:item-create \
  --type pm \
  --project <projectId> \
  --title "Write intro post" \
  --status "todo" \
  --due-date "2026-07-01"
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--title` | string | No | Item title |
| `--description` | string | No | Item description |
| `--primary-type` | string | No | Item category string |
| `--data` | string | No | Inline JSON for the item `data` field |
| `--json` | string | No | Path to JSON file with the full body |
| `--start-date` | string | No | Start date (ISO 8601) |
| `--due-date` | string | No | Due date (ISO 8601) |
| `--status` | string | No | Status string (max 16 chars) |
| `--priority` | number | No | Priority level (default `0`) |

---

### `projects:item-get`

Get a project item by id.

```bash
simplified projects:item-get --type pm --project <projectId> --id <itemId>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--id` | string | Yes | Item id |

---

### `projects:item-delete`

Soft-delete a project item by id.

```bash
simplified projects:item-delete --type pm --project <projectId> --id <itemId>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--id` | string | Yes | Item id |

---

### `projects:item-assign-agent`

Assign an AI agent (Chatbot) to a project item.

```bash
simplified projects:item-assign-agent \
  --type pm \
  --project <projectId> \
  --id <itemId> \
  --agent-id <agentUUID>
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--id` | string | Yes | Item id |
| `--agent-id` | string | Yes | Agent (Chatbot) UUID |

---

### `projects:item-reorder`

Move a project item to a new position index.

```bash
simplified projects:item-reorder \
  --type pm \
  --project <projectId> \
  --id <itemId> \
  --position 2
```

| Option | Type | Required | Description |
|---|---|---|---|
| `--type` | string | Yes | Project resourcetype |
| `--project` | string | Yes | Parent project id |
| `--id` | string | Yes | Item id |
| `--position` | number | Yes | New position index |

---

## Flag Reference

| Flag | Applies to | Meaning |
|---|---|---|
| `--type` | all commands | Polymorphic `resourcetype` selector |
| `--project` | item commands | Parent project id |
| `--id` | `projects:get`, `projects:delete`, all item commands | Resource the command acts on |
| `--partner-id` | `projects:export` | Partner integration id |
| `--item-ids` | `projects:export` | Comma-separated item UUIDs to export |
| `--agent-id` | `projects:item-assign-agent` | Agent (Chatbot) UUID |

---

## Worked Example

```bash
# 1. Create a project management project
simplified projects:create --type pm --title "Q3 Content Campaign"
# → { "id": "<projectId>", "title": "Q3 Content Campaign", ... }

# 2. Add an item to the project
simplified projects:item-create \
  --type pm \
  --project <projectId> \
  --title "Write launch blog post" \
  --status "todo" \
  --due-date "2026-07-15" \
  --priority 1
# → { "id": "<itemId>", ... }

# 3. Assign an AI agent to the item
simplified projects:item-assign-agent \
  --type pm \
  --project <projectId> \
  --id <itemId> \
  --agent-id <agentUUID>

# 4. Export the item to a partner integration when done
simplified projects:export \
  --type pm \
  --project <projectId> \
  --partner-id 42 \
  --item-ids "<itemId>"
```
