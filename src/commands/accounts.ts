import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';

const VALID_NETWORKS = [
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
  'pinterest',
  'threads',
  'google',
  'bluesky',
  'tiktokBusiness',
] as const;

export async function listAccounts(args: { network?: string }) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  if (args.network && !VALID_NETWORKS.includes(args.network as typeof VALID_NETWORKS[number])) {
    console.error(`❌ Invalid network: ${args.network}`);
    console.error(`   Valid options: ${VALID_NETWORKS.join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await api.getAccounts(args.network);
    console.log('✅ Social media accounts:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch accounts: ${msg}`);
    process.exit(1);
  }
}
