import { getApiKeyInfo, getConfig, maskApiKey } from '../config';
import { readStore, writeStore } from '../store';
import { promptHidden } from '../prompt';
import { SimplifiedAPI } from '../api';

export async function whoami(): Promise<void> {
  const api = new SimplifiedAPI(getConfig());

  const keyInfo = getApiKeyInfo();
  if (keyInfo) {
    const src = keyInfo.profile ? `source: ${keyInfo.source} "${keyInfo.profile}"` : `source: ${keyInfo.source}`;
    console.log(`🔑 API key: ${maskApiKey(keyInfo.key)} (${src})`);
  }

  try {
    const result = await api.getWorkspaces();

    if (result.default_workspace) {
      const dw = result.default_workspace;
      console.log(`✅ Default workspace: ${dw.name ?? '(unnamed)'} (${dw.id})`);
    }

    const teamspaces = result.teamspaces ?? [];
    if (teamspaces.length === 0) {
      console.log('   No additional teamspaces for this token.');
    } else {
      console.log('   Teamspaces:');
      for (const t of teamspaces) {
        const slug = t.slug ? ` [${t.slug}]` : '';
        console.log(`     ${t.name ?? '(unnamed)'}${slug} → ${t.id}`);
      }
    }
    console.log('');
    console.log('   Pass --teamspace <id> or run "simplified teamspace:use <id>" to scope commands.');
    console.log('   Note: one Api-Key is bound to one workspace; use a separate key per workspace.');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Discovery is implemented but may not be deployed everywhere yet; treat "not found" as "not available yet".
    if (msg.includes('404') || msg.includes('405')) {
      console.error('ℹ️  Remote discovery is not available on this account/API yet.');
      console.error('   Set the teamspace manually: simplified teamspace:add <alias> <id>');
      console.error('   then: simplified teamspace:use <alias>  (or pass --teamspace <id>)');
      process.exit(1);
    }
    console.error(`❌ Failed to fetch workspaces: ${msg}`);
    process.exit(1);
  }
}

/** Save an API key under a profile name and make it active. Key comes from --api-key or a hidden prompt. */
export async function login(name: string, apiKeyFlag?: string): Promise<void> {
  const profile = name?.trim();
  if (!profile) {
    console.error('❌ Profile name is required: simplified auth:login <name>');
    process.exit(1);
  }

  let key = apiKeyFlag?.trim();
  if (!key) {
    key = (await promptHidden('API key: ')).trim();
  }
  if (!key) {
    console.error('❌ No API key provided.');
    process.exit(1);
  }

  const store = readStore();
  const apiKeys = { ...(store.apiKeys ?? {}), [profile]: key };
  writeStore({ ...store, apiKeys, currentApiKey: profile });
  console.log(`✅ Logged in as "${profile}" (${maskApiKey(key)}). It is now the active key.`);
}

/** Switch the active API key profile. */
export function use(name: string): void {
  const profile = name?.trim();
  const store = readStore();
  if (!profile || !store.apiKeys?.[profile]) {
    console.error(`❌ No saved profile "${profile}". Run "simplified auth:list" to see profiles.`);
    process.exit(1);
  }
  writeStore({ ...store, currentApiKey: profile });
  console.log(`✅ Active key profile: "${profile}" (${maskApiKey(store.apiKeys[profile])}).`);
}

/** List saved API key profiles (masked) and mark the active one. */
export function list(): void {
  const store = readStore();
  const names = Object.keys(store.apiKeys ?? {});
  if (names.length === 0) {
    console.log('No saved key profiles. Log in: simplified auth:login <name>');
    return;
  }
  console.log('Saved key profiles:');
  for (const name of names) {
    const marker = name === store.currentApiKey ? '* ' : '  ';
    console.log(`  ${marker}${name} → ${maskApiKey(store.apiKeys![name])}`);
  }
}

/** Remove a profile. No name → remove the active one. */
export function logout(name?: string): void {
  const store = readStore();
  const target = name?.trim() || store.currentApiKey;
  if (!target) {
    console.error('❌ No active profile to log out of. Specify one: simplified auth:logout <name>');
    process.exit(1);
  }
  if (!store.apiKeys?.[target]) {
    console.error(`❌ No saved profile "${target}". Run "simplified auth:list" to see profiles.`);
    process.exit(1);
  }
  const apiKeys = { ...store.apiKeys };
  delete apiKeys[target];
  const currentApiKey = store.currentApiKey === target ? undefined : store.currentApiKey;
  writeStore({ ...store, apiKeys, currentApiKey });
  console.log(`✅ Removed key profile "${target}".`);
}
