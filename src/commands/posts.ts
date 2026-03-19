import { readFileSync } from 'fs';
import { getConfig } from '../config';
import { SimplifiedAPI, CreatePostRequest } from '../api';

function parseCommaSeparated(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function listPosts(args: {
  accounts: string;
  page?: number;
  'per-page'?: number;
  category?: string;
  tz?: string;
  search?: string;
  query?: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  try {
    const result = await api.getPosts({
      account_ids: args.accounts,
      page: args.page,
      per_page: args['per-page'],
      category: args.category,
      tz: args.tz,
      search: args.search,
      query: args.query,
    });
    console.log('📋 Posts:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch posts: ${msg}`);
    process.exit(1);
  }
}

export async function listDrafts(args: {
  accounts: string;
  page?: number;
  'per-page'?: number;
  search?: string;
  tz?: string;
  'order-by'?: string;
  order?: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  try {
    const result = await api.getDrafts({
      account_ids: args.accounts,
      page: args.page,
      per_page: args['per-page'],
      search: args.search,
      tz: args.tz,
      order_by: args['order-by'],
      order: args.order,
    });
    console.log('📋 Drafts:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch drafts: ${msg}`);
    process.exit(1);
  }
}

export async function deletePost(args: {
  'group-id'?: string;
  'post-schedule-id'?: string;
}) {
  if (!args['group-id'] && !args['post-schedule-id']) {
    console.error('❌ Either --group-id or --post-schedule-id is required.');
    process.exit(1);
  }
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  try {
    const result = await api.deletePost({
      group_id: args['group-id'],
      post_schedule_id: args['post-schedule-id'],
    });
    console.log('✅ Post deleted:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to delete post: ${msg}`);
    process.exit(1);
  }
}

export async function deleteDraft(args: {
  'group-id'?: string;
  'draft-ids'?: string;
}) {
  if (!args['group-id'] && !args['draft-ids']) {
    console.error('❌ Either --group-id or --draft-ids is required.');
    process.exit(1);
  }
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  const draftIds = args['draft-ids'] ? parseCommaSeparated(args['draft-ids']) : undefined;
  try {
    const result = await api.deleteDraft({
      group_id: args['group-id'],
      draft_ids: draftIds,
    });
    console.log('✅ Draft(s) deleted:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to delete draft: ${msg}`);
    process.exit(1);
  }
}

type UpdateArgs = {
  content?: string;
  date?: string;
  time?: string;
  timezone?: string;
  media?: string;
};

function buildUpdateFields(args: UpdateArgs) {
  const mediaUrls = args.media !== undefined
    ? (args.media ? parseCommaSeparated(args.media) : [])
    : undefined;
  return {
    ...(args.content !== undefined && { message: args.content }),
    ...(args.date && { date: args.date }),
    ...(args.time && { time: args.time }),
    ...(args.timezone && { timezone: args.timezone }),
    ...(mediaUrls !== undefined && { media: mediaUrls }),
  };
}

export async function updatePost(args: UpdateArgs & { 'post-id': string }) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  try {
    const result = await api.updatePost({ post_id: args['post-id'], ...buildUpdateFields(args) });
    console.log('✅ Post updated:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to update post: ${msg}`);
    process.exit(1);
  }
}

export async function updateDraft(args: UpdateArgs & { 'draft-id': string }) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);
  try {
    const result = await api.updateDraft({ draft_id: args['draft-id'], ...buildUpdateFields(args) });
    console.log('✅ Draft updated:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to update draft: ${msg}`);
    process.exit(1);
  }
}

export async function createPost(args: {
  json?: string;
  content?: string;
  accounts?: string;
  action?: string;
  date?: string;
  media?: string;
  additional?: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  let postData: CreatePostRequest;

  if (args.json) {
    try {
      const content = readFileSync(args.json, 'utf-8');
      postData = JSON.parse(content) as CreatePostRequest;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ Failed to read JSON file "${args.json}": ${msg}`);
      process.exit(1);
    }
  } else {
    if (!args.content || !args.accounts || !args.action) {
      console.error('❌ Required flags: --content (-c), --accounts (-a), --action');
      console.error('   Or use --json <file.json> for complex posts');
      console.error('   Actions: schedule | add_to_queue | draft');
      process.exit(1);
    }

    if (args.action === 'schedule' && !args.date) {
      console.error('❌ --date is required when action is "schedule" (format: YYYY-MM-DD HH:MM)');
      process.exit(1);
    }

    const accountIds = parseCommaSeparated(args.accounts);
    const mediaUrls = args.media ? parseCommaSeparated(args.media) : undefined;

    let additional: Record<string, unknown> | undefined;
    if (args.additional) {
      try {
        additional = JSON.parse(args.additional);
      } catch {
        console.error('❌ --additional must be valid JSON');
        process.exit(1);
      }
    }

    postData = {
      message: args.content,
      account_ids: accountIds,
      action: args.action as CreatePostRequest['action'],
      ...(args.date && { date: args.date }),
      ...(mediaUrls && { media: mediaUrls }),
      ...(additional && { additional }),
    };
  }

  try {
    const result = await api.createPost(postData);
    console.log('✅ Post created successfully:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create post: ${msg}`);
    process.exit(1);
  }
}
