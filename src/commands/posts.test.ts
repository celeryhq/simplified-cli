import { describe, it, expect } from 'vitest';
import {
  withGroupFlag,
  withTimezone,
  assertDraftScheduleFields,
  summarizeScheduleDraft,
  checkUpdateResult,
  buildComments,
  parseMediaJson,
  resolveMedia,
} from './posts';
import { CreatePostRequest } from '../api';

const base: CreatePostRequest = {
  message: 'hi',
  account_ids: ['1', '2'],
  action: 'draft',
};

describe('withGroupFlag', () => {
  it('sets group:true when the --group flag is passed (the -j path honors it too)', () => {
    expect(withGroupFlag(base, true)).toMatchObject({ group: true });
  });

  it('keeps group:true that is already in the payload even without the flag', () => {
    expect(withGroupFlag({ ...base, group: true }, undefined)).toMatchObject({ group: true });
  });

  it('does not add group when neither the flag nor the payload requests it', () => {
    expect(withGroupFlag(base, undefined).group).toBeUndefined();
  });

  it('does not mutate the input payload', () => {
    const input = { ...base };
    withGroupFlag(input, true);
    expect(input.group).toBeUndefined();
  });
});

describe('buildComments', () => {
  it('returns undefined when neither flag is set', () => {
    expect(buildComments(undefined, undefined)).toBeUndefined();
  });

  it('wraps a single --comment as a one-element array (no delay)', () => {
    expect(buildComments(undefined, 'Link in first comment')).toEqual([
      { message: 'Link in first comment' },
    ]);
  });

  it('parses a --comments JSON array, preserving message and delay', () => {
    expect(
      buildComments('[{"message":"first","delay":0},{"message":"later","delay":120}]', undefined)
    ).toEqual([
      { message: 'first', delay: 0 },
      { message: 'later', delay: 120 },
    ]);
  });

  it('omits delay when not provided in the JSON', () => {
    expect(buildComments('[{"message":"hi"}]', undefined)).toEqual([{ message: 'hi' }]);
  });

  it('lets --comments win over --comment when both are set', () => {
    expect(buildComments('[{"message":"from-array"}]', 'from-single')).toEqual([
      { message: 'from-array' },
    ]);
  });

  it('throws on invalid JSON', () => {
    expect(() => buildComments('not json', undefined)).toThrow(/valid JSON/);
  });

  it('throws when the JSON is not an array', () => {
    expect(() => buildComments('{"message":"hi"}', undefined)).toThrow(/array/);
  });

  it('throws when an entry is missing a string message', () => {
    expect(() => buildComments('[{"delay":10}]', undefined)).toThrow(/message/);
  });
});

describe('parseMediaJson', () => {
  it('parses a mix of URL strings and {url, thumbUrl} objects', () => {
    expect(
      parseMediaJson('["https://a.com/i.jpg",{"url":"https://a.com/v.mp4","thumbUrl":"https://a.com/p.jpg"}]')
    ).toEqual([
      'https://a.com/i.jpg',
      { url: 'https://a.com/v.mp4', thumbUrl: 'https://a.com/p.jpg' },
    ]);
  });

  it('parses an all-strings array', () => {
    expect(parseMediaJson('["https://a.com/1.jpg","https://a.com/2.jpg"]')).toEqual([
      'https://a.com/1.jpg',
      'https://a.com/2.jpg',
    ]);
  });

  it('accepts an object without thumbUrl and drops unknown keys', () => {
    expect(parseMediaJson('[{"url":"https://a.com/v.mp4","foo":"bar"}]')).toEqual([
      { url: 'https://a.com/v.mp4' },
    ]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseMediaJson('not json')).toThrow(/valid JSON/);
  });

  it('throws when the top level is not an array', () => {
    expect(() => parseMediaJson('{"url":"x"}')).toThrow(/array/);
  });

  it('throws, naming the index, when an object is missing url', () => {
    expect(() => parseMediaJson('["ok",{"thumbUrl":"x"}]')).toThrow(/\[1\].*url/);
  });

  it('throws when url is not a string', () => {
    expect(() => parseMediaJson('[{"url":5}]')).toThrow(/url/);
  });

  it('throws when thumbUrl is not a string', () => {
    expect(() => parseMediaJson('[{"url":"x","thumbUrl":5}]')).toThrow(/thumbUrl/);
  });

  it('throws on an element that is neither a string nor an object', () => {
    expect(() => parseMediaJson('[5]')).toThrow(/string or.*object/);
  });
});

describe('resolveMedia', () => {
  it('uses --media (comma-separated) when only it is given', () => {
    expect(resolveMedia('a,b', undefined, { clearOnEmpty: false })).toEqual({
      value: ['a', 'b'],
      mediaIgnored: false,
    });
  });

  it('uses --media-json when only it is given', () => {
    expect(
      resolveMedia(undefined, '[{"url":"v","thumbUrl":"t"}]', { clearOnEmpty: false })
    ).toEqual({ value: [{ url: 'v', thumbUrl: 't' }], mediaIgnored: false });
  });

  it('lets --media-json win over --media and flags it as ignored', () => {
    expect(resolveMedia('a,b', '["c"]', { clearOnEmpty: false })).toEqual({
      value: ['c'],
      mediaIgnored: true,
    });
  });

  it('omits media when neither flag is given (create path)', () => {
    expect(resolveMedia(undefined, undefined, { clearOnEmpty: false })).toEqual({
      value: undefined,
      mediaIgnored: false,
    });
  });

  it('clears media on empty --media when clearOnEmpty is true (update path)', () => {
    expect(resolveMedia('', undefined, { clearOnEmpty: true })).toEqual({
      value: [],
      mediaIgnored: false,
    });
  });

  it('omits media when --media is absent even with clearOnEmpty (update path)', () => {
    expect(resolveMedia(undefined, undefined, { clearOnEmpty: true })).toEqual({
      value: undefined,
      mediaIgnored: false,
    });
  });

  it('propagates parseMediaJson errors', () => {
    expect(() => resolveMedia(undefined, 'not json', { clearOnEmpty: false })).toThrow(/valid JSON/);
  });
});

describe('withTimezone', () => {
  it('adds timezone and leaves the date string unchanged', () => {
    const out = withTimezone({ ...base, action: 'schedule', date: '2026-11-12 09:00' }, 'America/Los_Angeles');
    expect(out).toMatchObject({ date: '2026-11-12 09:00', timezone: 'America/Los_Angeles' });
  });

  it('returns the payload unchanged when the flag is absent (workspace timezone)', () => {
    expect(withTimezone(base, undefined)).toBe(base);
  });

  it('keeps a timezone from a -j payload when the flag is absent', () => {
    expect(withTimezone({ ...base, timezone: 'Europe/Warsaw' }, undefined).timezone).toBe('Europe/Warsaw');
  });

  it('lets the flag win over a -j payload timezone', () => {
    expect(withTimezone({ ...base, timezone: 'Europe/Warsaw' }, 'UTC').timezone).toBe('UTC');
  });

  it('trims the value and leaves IANA validation to the API', () => {
    expect(withTimezone(base, ' Mars/Olympus ').timezone).toBe('Mars/Olympus');
  });

  it('throws on an empty value', () => {
    expect(() => withTimezone(base, '  ')).toThrow(/non-empty/);
  });

  it('does not mutate the input payload', () => {
    const input = { ...base };
    withTimezone(input, 'UTC');
    expect(input.timezone).toBeUndefined();
  });
});

describe('assertDraftScheduleFields', () => {
  it('accepts none of the three', () => {
    expect(() => assertDraftScheduleFields({})).not.toThrow();
  });

  it('accepts all three together', () => {
    expect(() =>
      assertDraftScheduleFields({ date: '2026-11-12', time: '09:00', timezone: 'America/Los_Angeles' })
    ).not.toThrow();
  });

  it('rejects date and time without timezone, naming the missing flag', () => {
    expect(() => assertDraftScheduleFields({ date: '2026-11-12', time: '09:00' })).toThrow(/missing: --timezone/);
  });

  it('rejects timezone alone', () => {
    expect(() => assertDraftScheduleFields({ timezone: 'UTC' })).toThrow(/missing: --date, --time/);
  });
});

describe('summarizeScheduleDraft', () => {
  it('returns the new post ids and ok when at least one post was created', () => {
    expect(summarizeScheduleDraft({ ids: ['p1', 'p2'], errors: [] })).toEqual({
      postIds: ['p1', 'p2'],
      errors: [],
      ok: true,
    });
  });

  it('is not ok when ids is empty, and keeps the errors', () => {
    const r = summarizeScheduleDraft({ ids: [], errors: ['Draft 456 is already scheduled'] });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(['Draft 456 is already scheduled']);
  });

  it('is not ok for an empty or missing body', () => {
    expect(summarizeScheduleDraft(undefined).ok).toBe(false);
    expect(summarizeScheduleDraft({}).ok).toBe(false);
  });
});

describe('checkUpdateResult', () => {
  it('is ok for a successful update (status 1)', () => {
    expect(
      checkUpdateResult({ status: 1, results: [{ status: 1, message: 'Post has been updated successfully' }] })
    ).toEqual({ ok: true, errors: [] });
  });

  it('fails on status 3 and returns the API message', () => {
    expect(
      checkUpdateResult({
        status: 3,
        results: [{ status: 3, message: "Draft not updated: User 1 don't have role for organization 2" }],
      })
    ).toEqual({ ok: false, errors: ["Draft not updated: User 1 don't have role for organization 2"] });
  });

  it('fails when one item failed even if the top level says ok', () => {
    const r = checkUpdateResult({ status: 1, results: [{ status: 1 }, { status: 3, message: 'nope' }] });
    expect(r).toEqual({ ok: false, errors: ['nope'] });
  });

  it('fails on a top-level error status without results', () => {
    expect(checkUpdateResult({ status: 3 })).toEqual({ ok: false, errors: ['status 3'] });
  });

  it('treats a body without a numeric status as success (backwards compatible)', () => {
    expect(checkUpdateResult({ id: 'x' }).ok).toBe(true);
    expect(checkUpdateResult(undefined).ok).toBe(true);
  });
});
