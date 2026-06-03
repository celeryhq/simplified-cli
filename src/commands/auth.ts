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
        console.log(`     ${t.name ?? '(unnamed)'} → ${t.id}`);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // The discovery endpoint is pending backend support; treat "not found" as "not available yet".
    if (msg.includes('404') || msg.includes('405')) {
      console.error('ℹ️  Remote discovery is not available yet on this account/API.');
      console.error('   Set the teamspace manually: simplified teamspace:add <alias> <id>');
      console.error('   then: simplified teamspace:use <alias>  (or pass --teamspace <id>)');
      process.exit(1);
    }
    console.error(`❌ Failed to fetch workspaces: ${msg}`);
    process.exit(1);
  }
}
