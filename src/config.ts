export interface SimplifiedConfig {
  apiKey: string;
  apiUrl: string;
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
  };
}
