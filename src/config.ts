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

export function getConfig(): SimplifiedConfig {
  const apiKey = process.env.SIMPLIFIED_API_KEY;
  if (!apiKey) {
    console.error('❌ SIMPLIFIED_API_KEY environment variable is required');
    console.error('   Get your API key from: https://simplified.com → Settings → API Keys');
    process.exit(1);
  }

  return {
    apiKey,
    apiUrl: process.env.SIMPLIFIED_API_URL || 'https://api.simplified.com',
    teamspaceId: getResolvedTeamspace().teamspaceId,
  };
}
