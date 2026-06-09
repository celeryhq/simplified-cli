import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import { loadJsonBody, readContent, requireXor } from './_shared';

vi.mock('fs');

afterEach(() => vi.restoreAllMocks());

describe('loadJsonBody', () => {
  it('parses inline --data', () => {
    expect(loadJsonBody({ data: '{"a":1}' })).toEqual({ a: 1 });
  });

  it('reads a --json file', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"b":2}');
    expect(loadJsonBody({ json: 'body.json' })).toEqual({ b: 2 });
  });

  it('scalar overrides win over the --json file body', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"title":"FromFile"}');
    expect(loadJsonBody({ json: 'p.json' }, { title: 'Override' })).toEqual({ title: 'Override' });
  });

  it('throws when both --json and --data are given', () => {
    expect(() => loadJsonBody({ json: 'a.json', data: '{}' })).toThrow(/only one of --json or --data/i);
  });

  it('throws on invalid inline JSON', () => {
    expect(() => loadJsonBody({ data: 'not json' })).toThrow(/valid json/i);
  });

  it('returns the overrides alone when no json/data supplied', () => {
    expect(loadJsonBody({}, { title: 'X' })).toEqual({ title: 'X' });
  });
});

describe('readContent', () => {
  it('returns inline content', () => {
    expect(readContent('hello', undefined)).toBe('hello');
  });

  it('reads content from a file', () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('# Title');
    expect(readContent(undefined, 'note.md')).toBe('# Title');
  });

  it('throws when both inline and file are given', () => {
    expect(() => readContent('hi', 'note.md')).toThrow(/only one of --content or --content-file/i);
  });

  it('returns undefined when neither is given', () => {
    expect(readContent(undefined, undefined)).toBeUndefined();
  });
});

describe('requireXor', () => {
  it('passes when exactly one side is present', () => {
    expect(() => requireXor('--a', 'x', '--b', undefined)).not.toThrow();
  });

  it('throws when neither side is present', () => {
    expect(() => requireXor('--a', undefined, '--b', undefined)).toThrow(/either --a or --b/i);
  });

  it('throws when both sides are present', () => {
    expect(() => requireXor('--a', 'x', '--b', 'y')).toThrow(/not both/i);
  });
});
