import { readStore, writeStore } from '../store';
import { getResolvedTeamspace } from '../config';

export function teamspaceCurrent(): void {
  const { teamspaceId, source } = getResolvedTeamspace();
  if (!teamspaceId) {
    console.log(`✅ Active context: default workspace (source: ${source})`);
    return;
  }

  // Show a friendly alias name if the active id has one saved.
  const store = readStore();
  const alias = Object.entries(store.teamspaces ?? {}).find(([, id]) => id === teamspaceId)?.[0];
  const label = alias ? `${alias} (${teamspaceId})` : teamspaceId;
  console.log(`✅ Active teamspace: ${label} (source: ${source})`);
}

export function teamspaceUse(args: { target: string }): void {
  const store = readStore();

  if (args.target === 'default') {
    delete store.currentTeamspace;
    writeStore(store);
    console.log('✅ Switched to default workspace');
    return;
  }

  // Translate alias -> id if saved; otherwise treat as a raw teamspace id.
  const resolved = store.teamspaces?.[args.target] ?? args.target;
  store.currentTeamspace = resolved;
  writeStore(store);

  const note = store.teamspaces?.[args.target]
    ? `alias "${args.target}" → ${resolved}`
    : `${resolved} (raw id)`;
  console.log(`✅ Active teamspace set to ${note}`);
}

export function teamspaceAdd(args: { alias: string; id: string }): void {
  if (args.alias === 'default') {
    console.error('❌ "default" is reserved (it means the default workspace)');
    process.exit(1);
  }

  const store = readStore();
  store.teamspaces = store.teamspaces ?? {};
  const existed = store.teamspaces[args.alias];
  store.teamspaces[args.alias] = args.id;
  writeStore(store);

  if (existed) {
    console.log(`✅ Updated alias "${args.alias}": ${existed} → ${args.id}`);
  } else {
    console.log(`✅ Added alias "${args.alias}" → ${args.id}`);
  }
}

export function teamspaceList(): void {
  const store = readStore();
  const entries = Object.entries(store.teamspaces ?? {});

  if (entries.length === 0) {
    console.log('No saved teamspaces. Add one with: simplified teamspace:add <alias> <id>');
    return;
  }

  const { teamspaceId, source } = getResolvedTeamspace();
  console.log('✅ Saved teamspaces:');
  for (const [alias, id] of entries) {
    const marker = id === teamspaceId ? ' *' : '';
    console.log(`   ${alias} → ${id}${marker}`);
  }
  if (!teamspaceId) {
    console.log('   (active context: default workspace)');
  } else if (source === 'flag' || source === 'env') {
    console.log(`   (active context from ${source}: ${teamspaceId})`);
  }
}

export function teamspaceRemove(args: { alias: string }): void {
  const store = readStore();
  if (!store.teamspaces || !(args.alias in store.teamspaces)) {
    console.error(`❌ No saved alias "${args.alias}"`);
    process.exit(1);
  }

  delete store.teamspaces[args.alias];
  writeStore(store);
  console.log(`✅ Removed alias "${args.alias}"`);
}
