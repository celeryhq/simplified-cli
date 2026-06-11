import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';
import { parseList } from './_shared';

/**
 * Build the create-bundle request body from CLI flags. Kept pure for testing.
 * Throws when the required title is missing. Empty/whitespace-only --draft-ids
 * are omitted so an empty bundle is created (the API seeds drafts only when
 * draft_ids is present).
 */
export function buildCreatePayload(args: {
  title?: string;
  description?: string;
  'draft-ids'?: string;
}): { title: string; description?: string; draft_ids?: string[] } {
  const title = args.title?.trim();
  if (!title) {
    throw new Error('--title is required');
  }

  const payload: { title: string; description?: string; draft_ids?: string[] } = { title };
  if (args.description !== undefined) payload.description = args.description;

  if (args['draft-ids']) {
    const draftIds = parseList(args['draft-ids']);
    if (draftIds.length > 0) payload.draft_ids = draftIds;
  }
  return payload;
}

/**
 * Build the add-drafts request body from CLI flags. Kept pure for testing.
 * Throws when bundle-id is missing or the draft list is empty — the API
 * requires at least one draft (minItems: 1).
 */
export function buildAddDraftsPayload(args: {
  'bundle-id'?: string;
  'draft-ids'?: string;
}): { bundle_id: string; draft_ids: string[] } {
  const bundleId = args['bundle-id']?.trim();
  if (!bundleId) {
    throw new Error('--bundle-id is required');
  }

  const draftIds = args['draft-ids'] ? parseList(args['draft-ids']) : [];
  if (draftIds.length === 0) {
    throw new Error('--draft-ids must contain at least one draft ID');
  }
  return { bundle_id: bundleId, draft_ids: draftIds };
}

export async function createReviewBundle(args: {
  title?: string;
  description?: string;
  'draft-ids'?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const payload = buildCreatePayload(args);
    const result = await api.createReviewBundle(payload);
    console.log('✅ Review bundle created:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to create review bundle: ${msg}`);
    process.exit(1);
  }
}

export async function addDraftsToReviewBundle(args: {
  'bundle-id'?: string;
  'draft-ids'?: string;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const payload = buildAddDraftsPayload(args);
    const result = await api.addDraftsToReviewBundle(payload);
    console.log('✅ Drafts added to review bundle:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to add drafts to review bundle: ${msg}`);
    process.exit(1);
  }
}
