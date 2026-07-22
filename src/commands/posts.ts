import { readFileSync } from 'fs';
import { getConfig } from '../config';
import { SimplifiedAPI, CreatePostRequest, PostComment, MediaItem } from '../api';

function parseCommaSeparated(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parse the `--media-json` flag: a JSON array whose elements are either a URL string or a
 * `{ url, thumbUrl? }` object. Objects are normalized to `{ url }` or `{ url, thumbUrl }`,
 * dropping any other keys. Throws with a clear, index-annotated message on invalid input so the
 * caller can surface it and exit.
 */
export function parseMediaJson(input: string): MediaItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error('--media-json must be valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('--media-json must be a JSON array');
  }
  return parsed.map((item, i): MediaItem => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      if (typeof obj.url !== 'string') {
        throw new Error(`--media-json[${i}]: "url" is required and must be a string`);
      }
      if (obj.thumbUrl !== undefined && typeof obj.thumbUrl !== 'string') {
        throw new Error(`--media-json[${i}]: "thumbUrl" must be a string`);
      }
      return obj.thumbUrl !== undefined
        ? { url: obj.url, thumbUrl: obj.thumbUrl }
        : { url: obj.url };
    }
    throw new Error(`--media-json[${i}]: must be a URL string or a {url, thumbUrl} object`);
  });
}

/**
 * Resolve the media payload from the two mutually-exclusive flags. `--media-json` wins over
 * `--media` when both are present (reported via `mediaIgnored` so the caller can warn).
 *
 * `clearOnEmpty` distinguishes the update path (an empty-but-present `--media` clears media by
 * sending `[]`) from the create path (an empty `--media` is simply omitted).
 */
export function resolveMedia(
  media: string | undefined,
  mediaJson: string | undefined,
  opts: { clearOnEmpty: boolean }
): { value?: MediaItem[]; mediaIgnored: boolean } {
  if (mediaJson) {
    return { value: parseMediaJson(mediaJson), mediaIgnored: Boolean(media) };
  }
  if (opts.clearOnEmpty) {
    const value = media !== undefined ? (media ? parseCommaSeparated(media) : []) : undefined;
    return { value, mediaIgnored: false };
  }
  return { value: media ? parseCommaSeparated(media) : undefined, mediaIgnored: false };
}

/**
 * Build the `comments` array for a post from CLI flags.
 *
 * `--comments` takes a JSON array of `{ message, delay? }` objects for full control and, when
 * present, wins over `--comment`. `--comment` is a convenience for a single first comment
 * (delay 0). Returns undefined when neither flag is set so the field is omitted from the payload.
 *
 * Throws on malformed input so the caller can surface a clear error and exit.
 */
export function buildComments(commentsJson?: string, singleComment?: string): PostComment[] | undefined {
  if (commentsJson !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(commentsJson);
    } catch {
      throw new Error('--comments must be valid JSON (an array of { "message", "delay" } objects)');
    }
    if (!Array.isArray(parsed)) {
      throw new Error('--comments must be a JSON array of { "message", "delay" } objects');
    }
    return parsed.map((c, i) => {
      if (typeof c !== 'object' || c === null || typeof (c as PostComment).message !== 'string') {
        throw new Error(`--comments[${i}] must be an object with a string "message"`);
      }
      const { message, delay } = c as PostComment;
      return delay !== undefined ? { message, delay } : { message };
    });
  }
  if (singleComment !== undefined) {
    return [{ message: singleComment }];
  }
  return undefined;
}

/**
 * Merge the --group flag into a post payload. Grouping is enabled when the flag is set OR
 * the payload already carries `group: true`, so it works the same whether the payload was
 * built from individual flags or loaded from a -j JSON file. Returns a new object; never
 * mutates the input.
 */
export function withGroupFlag(postData: CreatePostRequest, groupFlag?: boolean): CreatePostRequest {
  return groupFlag || postData.group ? { ...postData, group: true } : postData;
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
  comment?: string;
  comments?: string;
  additional?: string;
  group?: boolean;
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

    let comments: PostComment[] | undefined;
    try {
      comments = buildComments(args.comments, args.comment);
    } catch (e: unknown) {
      console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }

    postData = {
      message: args.content,
      account_ids: accountIds,
      action: args.action as CreatePostRequest['action'],
      ...(args.date && { date: args.date }),
      ...(mediaUrls && { media: mediaUrls }),
      ...(comments && { comments }),
      ...(additional && { additional }),
    };
  }

  // Honor --group on both paths (flag branch and -j JSON payload). On the -j path this also
  // preserves a `"group": true` already present in the file.
  postData = withGroupFlag(postData, args.group);

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
