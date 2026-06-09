import { readStore, Store } from './store';

export interface SimplifiedConfig {
  apiKey: string;
  apiUrl: string;
  /** Active teamspace id, or undefined for the token's default workspace. */
  teamspaceId?: string;
}

export type TeamspaceSource = 'flag' | 'env' | 'config' | 'default';

export interface ResolvedTeamspace {
  /** Resolved teamspace id, or undefined = default workspace. */
  teamspaceId?: string;
  /** Where the decision came from (for `teamspace:current`). */
  source: TeamspaceSource;
}

// Set from the global --teamspace flag by the yargs middleware in index.ts.
let teamspaceOverride: string | undefined;

/** Set the --teamspace flag override. MUST be called (by the yargs middleware) before getConfig()/getResolvedTeamspace(). */
export function setTeamspaceOverride(value?: string): void {
  teamspaceOverride = value;
}

// Set from the global --api-key flag by the yargs middleware in index.ts.
let apiKeyOverride: string | undefined;

/** Set the --api-key flag override. MUST be called (by the yargs middleware) before getConfig()/getApiKeyInfo(). */
export function setApiKeyOverride(value?: string): void {
  apiKeyOverride = value;
}

/**
 * Resolve the active teamspace from (highest first): flag, env, store.currentTeamspace.
 * The literal "default" (or empty) means "default workspace" -> teamspaceId undefined.
 * A value matching a saved alias is translated to its id; otherwise it is used as a raw id.
 */
export function resolveTeamspace(sources: {
  flag?: string;
  env?: string;
  store: Store;
}): ResolvedTeamspace {
  let raw: string | undefined;
  let source: TeamspaceSource;

  if (sources.flag != null && sources.flag !== '') {
    raw = sources.flag;
    source = 'flag';
  } else if (sources.env != null && sources.env !== '') {
    raw = sources.env;
    source = 'env';
  } else if (sources.store.currentTeamspace != null && sources.store.currentTeamspace !== '') {
    raw = sources.store.currentTeamspace;
    source = 'config';
  } else {
    return { teamspaceId: undefined, source: 'default' };
  }

  if (raw === 'default') {
    return { teamspaceId: undefined, source };
  }

  const resolved = sources.store.teamspaces?.[raw] ?? raw;
  return { teamspaceId: resolved, source };
}

/** Resolve the active teamspace using the current flag override, env, and store. */
export function getResolvedTeamspace(): ResolvedTeamspace {
  return resolveTeamspace({
    flag: teamspaceOverride,
    env: process.env.SIMPLIFIED_TEAMSPACE_ID,
    store: readStore(),
  });
}

/** Where the active API key was resolved from. */
export type ApiKeySource = 'flag' | 'store' | 'env';

export interface ApiKeyInfo {
  key: string;
  source: ApiKeySource;
  /** Active profile name, when the key came from the store. */
  profile?: string;
}

/**
 * Resolve the active API key from (highest first): --api-key flag, active store profile, env var.
 * The store profile deliberately wins over the env var so a logged-in user is not silently
 * overridden by a stale `SIMPLIFIED_API_KEY` left in the shell. Returns undefined when none is set.
 */
export function getApiKeyInfo(store: Store = readStore()): ApiKeyInfo | undefined {
  if (apiKeyOverride) return { key: apiKeyOverride, source: 'flag' };

  const profile = store.currentApiKey;
  if (profile && store.apiKeys?.[profile]) {
    return { key: store.apiKeys[profile], source: 'store', profile };
  }

  const env = process.env.SIMPLIFIED_API_KEY;
  if (env) return { key: env, source: 'env' };

  return undefined;
}

/**
 * Mask an API key for safe display while still uniquely identifying it.
 * Simplified keys are `<keyId>.<secret>`; the keyId before the dot is a public identifier,
 * so we show it in full and mask only the secret. Two different keys that share a prefix and
 * suffix (which fooled a plain head/tail mask once) differ in their keyId, so this catches them.
 */
export function maskApiKey(key: string): string {
  const dot = key.indexOf('.');
  if (dot > 0) {
    return `${key.slice(0, dot)}.…${key.slice(-4)} (len ${key.length})`;
  }
  // Unknown format: reveal only the extremes.
  return `${key.slice(0, 4)}…${key.slice(-4)} (len ${key.length})`;
}

export function getConfig(): SimplifiedConfig {
  const info = getApiKeyInfo();
  if (!info) {
    console.error('❌ No API key configured.');
    console.error('   Log in: simplified auth:login <name>');
    console.error('   or set the SIMPLIFIED_API_KEY environment variable.');
    console.error('   Get your API key from: https://simplified.com → Settings → API Keys');
    process.exit(1);
  }

  // Warn when an env key exists but is being ignored in favor of the active profile, so a stale
  // SIMPLIFIED_API_KEY in the shell can never silently shadow the key the user logged in with.
  const env = process.env.SIMPLIFIED_API_KEY;
  if (info.source === 'store' && env && env !== info.key) {
    console.error(
      `⚠️  SIMPLIFIED_API_KEY is set (${maskApiKey(env)}) but ignored — ` +
        `using profile "${info.profile}" (${maskApiKey(info.key)}). ` +
        `Run "simplified auth:logout" to fall back to the env var.`
    );
  }

  return {
    apiKey: info.key,
    apiUrl: process.env.SIMPLIFIED_API_URL || 'https://api.simplified.com',
    teamspaceId: getResolvedTeamspace().teamspaceId,
  };
}
