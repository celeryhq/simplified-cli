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
