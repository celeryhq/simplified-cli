import { describe, it, expect } from 'vitest';
import { withGroupFlag, buildComments } from './posts';
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
