import * as fs from 'fs';

/** Parse an inline JSON string, throwing a friendly error on malformed input. */
function parseInlineJson(input: string, flag: string): Record<string, unknown> {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch {
    throw new Error(`${flag} must be valid JSON`);
  }
}

/**
 * Resolve a request body from `--json <file>` or `--data '<json>'`, then shallow-merge
 * scalar overrides on top (so dedicated flags like --title win over the file/inline body).
 * `--json` and `--data` are mutually exclusive.
 */
export function loadJsonBody(
  source: { json?: string; data?: string },
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  if (source.json && source.data) {
    throw new Error('Provide only one of --json or --data, not both.');
  }

  let base: Record<string, unknown> = {};
  if (source.json) {
    let text: string;
    try {
      text = fs.readFileSync(source.json, 'utf-8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to read JSON file "${source.json}": ${msg}`);
    }
    base = parseInlineJson(text, `--json file "${source.json}"`);
  } else if (source.data) {
    base = parseInlineJson(source.data, '--data');
  }

  const cleanedOverrides: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) cleanedOverrides[k] = v;
  }
  return { ...base, ...cleanedOverrides };
}

/**
 * Resolve markdown content from inline text or a file path. Mutually exclusive.
 * Returns undefined when neither is supplied.
 */
export function readContent(text?: string, file?: string): string | undefined {
  if (text !== undefined && file !== undefined) {
    throw new Error('Provide only one of --content or --content-file, not both.');
  }
  if (file !== undefined) {
    try {
      return fs.readFileSync(file, 'utf-8');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to read content file "${file}": ${msg}`);
    }
  }
  return text;
}

/** Enforce that exactly one of two mutually-exclusive inputs is present. */
export function requireXor(
  aFlag: string,
  aValue: unknown,
  bFlag: string,
  bValue: unknown
): void {
  const hasA = aValue !== undefined && aValue !== '';
  const hasB = bValue !== undefined && bValue !== '';
  if (!hasA && !hasB) {
    throw new Error(`Provide either ${aFlag} or ${bFlag}.`);
  }
  if (hasA && hasB) {
    throw new Error(`Provide ${aFlag} or ${bFlag}, not both.`);
  }
}

/** Split a comma-separated list into a trimmed, non-empty string array. */
export function parseList(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}
