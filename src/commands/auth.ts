import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';

export async function whoami(): Promise<void> {
  const api = new SimplifiedAPI(getConfig());

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
