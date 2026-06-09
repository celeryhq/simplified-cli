import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

export interface Store {
  /** Active teamspace id. Undefined = default workspace. */
  currentTeamspace?: string;
  /** Saved alias -> teamspace id mappings. */
  teamspaces?: Record<string, string>;
  /** Saved profile name -> API key. */
  apiKeys?: Record<string, string>;
  /** Active API key profile name. */
  currentApiKey?: string;
}

export function storeDir(): string {
  return path.join(os.homedir(), '.simplified');
}

export function storePath(): string {
  return path.join(storeDir(), 'config.json');
}

/** Read the store. Missing or malformed file returns an empty store; never throws. */
export function readStore(): Store {
  try {
    const raw = fs.readFileSync(storePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Store;
    return {};
  } catch {
    return {};
  }
}

/**
 * Write the store atomically (temp file + rename) so an interrupted write cannot corrupt it.
 * The file is written with mode 0600 because it can hold API keys (secrets).
 */
export function writeStore(store: Store): void {
  const dir = storeDir();
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `config.json.${randomUUID()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.renameSync(tmp, storePath());
    // Tighten perms even if the destination already existed with looser bits.
    fs.chmodSync(storePath(), 0o600);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup */ }
    throw err;
  }
}
