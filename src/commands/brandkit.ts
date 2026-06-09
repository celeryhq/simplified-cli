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
