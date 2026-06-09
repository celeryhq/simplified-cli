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
