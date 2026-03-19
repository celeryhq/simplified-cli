import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';

export async function getAnalyticsRange(args: {
  account: number;
  metrics: string;
  from: string;
  to: string;
  tz?: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  const metrics = args.metrics.split(',').map((m) => m.trim());

  try {
    const result = await api.getAnalyticsRange({
      account_id: args.account,
      metrics,
      date_from: args.from,
      date_to: args.to,
      tz: args.tz || 'UTC',
    });
    console.log('📊 Analytics (time-series):');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch analytics: ${msg}`);
    process.exit(1);
  }
}

export async function getAnalyticsPosts(args: {
  account: number;
  from: string;
  to: string;
  page?: number;
  'per-page'?: number;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  try {
    const result = await api.getAnalyticsPosts({
      account_id: args.account,
      date_from: args.from,
      date_to: args.to,
      page: args.page,
      per_page: args['per-page'],
    });
    console.log('📊 Post analytics:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch post analytics: ${msg}`);
    process.exit(1);
  }
}

export async function getAnalyticsAggregated(args: {
  account: number;
  from: string;
  to: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  try {
    const result = await api.getAnalyticsAggregated({
      account_id: args.account,
      date_from: args.from,
      date_to: args.to,
    });
    console.log('📊 Aggregated analytics:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch aggregated analytics: ${msg}`);
    process.exit(1);
  }
}

export async function getAnalyticsAudience(args: {
  account: number;
  from: string;
  to: string;
  tz?: string;
}) {
  const config = getConfig();
  const api = new SimplifiedAPI(config);

  try {
    const result = await api.getAnalyticsAudience({
      account_id: args.account,
      date_from: args.from,
      date_to: args.to,
      tz: args.tz,
    });
    console.log('📊 Audience analytics:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Failed to fetch audience analytics: ${msg}`);
    process.exit(1);
  }
}
