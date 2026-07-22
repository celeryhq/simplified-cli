import { describe, it, expect } from 'vitest';
import { withGroupFlag, buildComments, parseMediaJson, resolveMedia } from './posts';
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
