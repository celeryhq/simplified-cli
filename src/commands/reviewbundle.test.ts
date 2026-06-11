import { describe, it, expect } from 'vitest';
import { buildCreatePayload, buildAddDraftsPayload } from './reviewbundle';

describe('buildCreatePayload', () => {
  it('builds a minimal payload from just a title', () => {
    expect(buildCreatePayload({ title: 'Q2 social drafts' })).toEqual({
      title: 'Q2 social drafts',
    });
  });

  it('includes description and parsed draft_ids when provided', () => {
    expect(
      buildCreatePayload({
        title: 'April campaign',
        description: 'Please review.',
        'draft-ids': 'draft-1, draft-2 ,draft-3',
      })
    ).toEqual({
      title: 'April campaign',
      description: 'Please review.',
      draft_ids: ['draft-1', 'draft-2', 'draft-3'],
    });
  });

  it('omits draft_ids when the list is empty/whitespace (creates an empty bundle)', () => {
    expect(buildCreatePayload({ title: 'Empty', 'draft-ids': ' , ' })).toEqual({
      title: 'Empty',
    });
  });

  it('throws when title is missing or whitespace', () => {
    expect(() => buildCreatePayload({})).toThrow('--title is required');
    expect(() => buildCreatePayload({ title: '   ' })).toThrow('--title is required');
  });

  it('does not mutate the input args', () => {
    const args = { title: 'x', 'draft-ids': 'a,b' };
    buildCreatePayload(args);
    expect(args).toEqual({ title: 'x', 'draft-ids': 'a,b' });
  });
});

describe('buildAddDraftsPayload', () => {
  it('builds a payload with bundle_id and parsed draft_ids', () => {
    expect(
      buildAddDraftsPayload({ 'bundle-id': 'abc123', 'draft-ids': 'draft-3, draft-4' })
    ).toEqual({
      bundle_id: 'abc123',
      draft_ids: ['draft-3', 'draft-4'],
    });
  });

  it('throws when bundle-id is missing', () => {
    expect(() => buildAddDraftsPayload({ 'draft-ids': 'draft-1' })).toThrow(
      '--bundle-id is required'
    );
  });

  it('throws when draft-ids is missing or resolves to an empty list', () => {
    expect(() => buildAddDraftsPayload({ 'bundle-id': 'abc123' })).toThrow(
      '--draft-ids must contain at least one draft ID'
    );
    expect(() =>
      buildAddDraftsPayload({ 'bundle-id': 'abc123', 'draft-ids': ' , ' })
    ).toThrow('--draft-ids must contain at least one draft ID');
  });
});
