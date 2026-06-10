import { describe, it, expect } from 'vitest';
import { withGroupFlag } from './posts';
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
