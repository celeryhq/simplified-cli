import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import figlet from 'figlet';

function gradient(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, steps: number, step: number) {
  const t = steps <= 1 ? 0 : step / (steps - 1);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `\x1b[38;2;${r};${g};${b}m`;
}

function printBanner() {
  const lines = figlet.textSync('SIMPLIFIED', { font: 'ANSI Shadow' }).split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const reset = '\x1b[0m';
  // gradient: #6230E8 → #A855F7
  nonEmpty.forEach((line, i) => {
    process.stdout.write(gradient(98, 48, 232, 168, 85, 247, nonEmpty.length, i) + line + reset + '\n');
  });
  console.log(`\x1b[38;2;168;85;247m  Create, schedule, publish and analyze — all in one place${reset}\n`);
}
import { listAccounts } from './commands/accounts';
import {
  createPost,
  listPosts,
  listDrafts,
  deletePost,
  deleteDraft,
  updatePost,
  updateDraft,
} from './commands/posts';
import {
  getAnalyticsRange,
  getAnalyticsPosts,
  getAnalyticsAggregated,
  getAnalyticsAudience,
} from './commands/analytics';
import {
  blurBackground,
  convertImageFormat,
  generativeFill,
  imageOutpainting,
  upscaleImage,
  magicInpaint,
  pixToPix,
  removeBackground,
  replaceImage,
  restoreImage,
  sdScribble,
  getTask,
} from './commands/image';

const argv = hideBin(process.argv);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  printBanner();
}

yargs(argv)
  .scriptName('simplified')
  .usage('$0 <command> [options]')

  // ── Accounts ──────────────────────────────────────────────────────────────
  .command(
    'accounts:list',
    'List connected social media accounts',
    (y: Argv) =>
      y.option('network', {
        alias: 'n',
        type: 'string',
        description:
          'Filter by platform: facebook | instagram | linkedin | tiktok | tiktokBusiness | youtube | pinterest | threads | google | bluesky',
      }),
    listAccounts
  )

  // ── Posts ──────────────────────────────────────────────────────────────────
  .command(
    'posts:create',
    'Create, schedule, queue or draft a social media post',
    (y: Argv) =>
      y
        .option('content', {
          alias: 'c',
          type: 'string',
          description: 'Post text content',
        })
        .option('accounts', {
          alias: 'a',
          type: 'string',
          description: 'Comma-separated account IDs',
        })
        .option('action', {
          type: 'string',
          choices: ['schedule', 'add_to_queue', 'draft'] as const,
          description: 'Post action',
        })
        .option('date', {
          alias: 'd',
          type: 'string',
          description: 'Schedule datetime in format: YYYY-MM-DD HH:MM (required for schedule)',
        })
        .option('media', {
          alias: 'm',
          type: 'string',
          description: 'Comma-separated public media URLs (max 10)',
        })
        .option('additional', {
          type: 'string',
          description: 'JSON string with platform-specific settings (see SKILL.md)',
        })
        .option('json', {
          alias: 'j',
          type: 'string',
          description: 'Path to JSON file with full post payload',
        })
        .example(
          '$0 posts:create -c "Hello world!" -a "123" --action add_to_queue',
          'Queue a post'
        )
        .example(
          '$0 posts:create -c "Scheduled post" -a "123,456" --action schedule --date "2026-03-15 12:00"',
          'Schedule a post to multiple accounts'
        )
        .example('$0 posts:create --json campaign.json', 'Create post from JSON file'),
    createPost
  )

  // ── Posts: List ────────────────────────────────────────────────────────────
  .command(
    'posts:list',
    'List scheduled/published posts for given accounts',
    (y: Argv) =>
      y
        .option('accounts', {
          alias: 'a',
          type: 'string',
          description: 'Comma-separated account IDs',
          demandOption: true,
        })
        .option('page', { type: 'number', description: 'Page number', default: 1 })
        .option('per-page', { type: 'number', description: 'Posts per page', default: 10 })
        .option('category', {
          type: 'string',
          description: 'Post category filter (default: all)',
          default: 'all',
        })
        .option('tz', { type: 'string', description: 'Timezone (default: UTC)', default: 'UTC' })
        .option('search', { type: 'string', description: 'Search text' })
        .option('query', { type: 'string', description: 'Additional query filter' }),
    listPosts
  )

  // ── Posts: List Drafts ─────────────────────────────────────────────────────
  .command(
    'posts:list-drafts',
    'List drafts for given accounts',
    (y: Argv) =>
      y
        .option('accounts', {
          alias: 'a',
          type: 'string',
          description: 'Comma-separated account IDs',
          demandOption: true,
        })
        .option('page', { type: 'number', description: 'Page number', default: 1 })
        .option('per-page', { type: 'number', description: 'Drafts per page', default: 10 })
        .option('search', { type: 'string', description: 'Search text' })
        .option('tz', { type: 'string', description: 'Timezone (default: UTC)', default: 'UTC' })
        .option('order-by', {
          type: 'string',
          description: 'Sort field (default: post.date)',
          default: 'post.date',
        })
        .option('order', {
          type: 'string',
          choices: ['-1', '1'] as const,
          description: 'Sort direction: -1 desc, 1 asc (default: -1)',
          default: '-1',
        }),
    listDrafts
  )

  // ── Posts: Delete ──────────────────────────────────────────────────────────
  .command(
    'posts:delete',
    'Delete a scheduled post by group ID or post-schedule ID',
    (y: Argv) =>
      y
        .option('group-id', { type: 'string', description: 'Group ID of the post' })
        .option('post-schedule-id', { type: 'string', description: 'Post schedule ID' }),
    deletePost
  )

  // ── Posts: Delete Draft ────────────────────────────────────────────────────
  .command(
    'posts:delete-draft',
    'Delete draft(s) by group ID or draft IDs',
    (y: Argv) =>
      y
        .option('group-id', { type: 'string', description: 'Group ID of the drafts' })
        .option('draft-ids', {
          type: 'string',
          description: 'Comma-separated draft IDs to delete',
        }),
    deleteDraft
  )

  // ── Posts: Update ──────────────────────────────────────────────────────────
  .command(
    'posts:update',
    'Update a scheduled post',
    (y: Argv) =>
      y
        .option('post-id', {
          type: 'string',
          description: 'Post ID to update',
          demandOption: true,
        })
        .option('content', { alias: 'c', type: 'string', description: 'New post text' })
        .option('date', { type: 'string', description: 'New date (YYYY-MM-DD)' })
        .option('time', { type: 'string', description: 'New time (HH:MM)' })
        .option('timezone', { type: 'string', description: 'New timezone (e.g. UTC)' })
        .option('media', {
          alias: 'm',
          type: 'string',
          description: 'Comma-separated media URLs (pass empty string to clear)',
        }),
    updatePost
  )

  // ── Posts: Update Draft ────────────────────────────────────────────────────
  .command(
    'posts:update-draft',
    'Update a draft',
    (y: Argv) =>
      y
        .option('draft-id', {
          type: 'string',
          description: 'Draft ID to update',
          demandOption: true,
        })
        .option('content', { alias: 'c', type: 'string', description: 'New draft text' })
        .option('date', { type: 'string', description: 'New date (YYYY-MM-DD)' })
        .option('time', { type: 'string', description: 'New time (HH:MM)' })
        .option('timezone', { type: 'string', description: 'New timezone (e.g. UTC)' })
        .option('media', {
          alias: 'm',
          type: 'string',
          description: 'Comma-separated media URLs (pass empty string to clear)',
        }),
    updateDraft
  )

  // ── Analytics: Range ───────────────────────────────────────────────────────
  .command(
    'analytics:range',
    'Get time-series metrics for a social media account',
    (y: Argv) =>
      y
        .option('account', {
          alias: 'a',
          type: 'number',
          description: 'Account ID',
          demandOption: true,
        })
        .option('metrics', {
          alias: 'm',
          type: 'string',
          description: 'Comma-separated metrics (e.g. views,reach,follower_count)',
          demandOption: true,
        })
        .option('from', {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
          demandOption: true,
        })
        .option('to', {
          type: 'string',
          description: 'End date YYYY-MM-DD (must not be in the future)',
          demandOption: true,
        })
        .option('tz', {
          type: 'string',
          description: 'Timezone (e.g. UTC, Europe/Warsaw)',
          default: 'UTC',
        })
        .example(
          '$0 analytics:range -a 123 --metrics "views,reach,follower_count" --from 2026-03-01 --to 2026-03-13',
          'Instagram time-series'
        ),
    getAnalyticsRange
  )

  // ── Analytics: Posts ───────────────────────────────────────────────────────
  .command(
    'analytics:posts',
    'Get per-post analytics for a social media account',
    (y: Argv) =>
      y
        .option('account', {
          alias: 'a',
          type: 'number',
          description: 'Account ID',
          demandOption: true,
        })
        .option('from', {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
          demandOption: true,
        })
        .option('to', {
          type: 'string',
          description: 'End date YYYY-MM-DD',
          demandOption: true,
        })
        .option('page', {
          type: 'number',
          description: 'Page number',
          default: 1,
        })
        .option('per-page', {
          type: 'number',
          description: 'Posts per page (max 100)',
          default: 10,
        }),
    getAnalyticsPosts
  )

  // ── Analytics: Aggregated ─────────────────────────────────────────────────
  .command(
    'analytics:aggregated',
    'Get aggregated KPIs (impressions, engagement, followers, publishing)',
    (y: Argv) =>
      y
        .option('account', {
          alias: 'a',
          type: 'number',
          description: 'Account ID',
          demandOption: true,
        })
        .option('from', {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
          demandOption: true,
        })
        .option('to', {
          type: 'string',
          description: 'End date YYYY-MM-DD',
          demandOption: true,
        }),
    getAnalyticsAggregated
  )

  // ── Analytics: Audience ───────────────────────────────────────────────────
  .command(
    'analytics:audience',
    'Get audience demographics (followers, gender, country breakdown)',
    (y: Argv) =>
      y
        .option('account', {
          alias: 'a',
          type: 'number',
          description: 'Account ID',
          demandOption: true,
        })
        .option('from', {
          type: 'string',
          description: 'Start date YYYY-MM-DD',
          demandOption: true,
        })
        .option('to', {
          type: 'string',
          description: 'End date YYYY-MM-DD',
          demandOption: true,
        })
        .option('tz', {
          type: 'string',
          description: 'Timezone (e.g. UTC, Europe/Warsaw)',
        }),
    getAnalyticsAudience
  )

  // ── Image Tools ────────────────────────────────────────────────────────────
  .command(
    'image:blur-background',
    'Blur the background of an image (synchronous)',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('blur', {
          type: 'number',
          description: 'Blur intensity (1-100)',
          demandOption: true,
        }),
    blurBackground
  )

  .command(
    'image:remove-background',
    'Remove or replace the background of an image',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('magic-crop', { type: 'boolean', description: 'Auto-crop after removal' })
        .option('bg-color', { type: 'string', description: 'Background color (e.g. #ffffff)' })
        .option('format', {
          type: 'string',
          choices: ['png', 'jpeg'] as const,
          description: 'Output format',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    removeBackground
  )

  .command(
    'image:convert',
    'Convert an image to a different format',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('format', {
          type: 'string',
          choices: ['jpeg', 'png', 'webp', 'bmp', 'jpg'] as const,
          description: 'Output format (default: jpg)',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    convertImageFormat
  )

  .command(
    'image:upscale',
    'Upscale image resolution (2x, 4x or 8x)',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('scale', {
          type: 'number',
          choices: [2, 4, 8] as const,
          description: 'Scale factor (default: 2)',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    upscaleImage
  )

  .command(
    'image:restore',
    'Restore and enhance a photo',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('scale', { type: 'number', description: 'Scale factor (default: 1)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    restoreImage
  )

  .command(
    'image:generative-fill',
    'AI-powered generative fill / inpainting with a prompt',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('prompt', { type: 'string', description: 'Fill instruction', demandOption: true })
        .option('mask-url', { type: 'string', description: 'Mask image URL' })
        .option('negative-prompt', { type: 'string', description: 'Things to avoid' })
        .option('count', { type: 'number', description: 'Number of results (default: 4)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    generativeFill
  )

  .command(
    'image:outpaint',
    'Extend image content beyond its borders',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('mask-url', {
          type: 'string',
          description: 'Mask image URL',
          demandOption: true,
        })
        .option('prompt', {
          type: 'string',
          description: 'Content generation prompt',
          demandOption: true,
        })
        .option('negative-prompt', { type: 'string', description: 'Things to avoid' })
        .option('guidance-scale', {
          type: 'number',
          description: 'Guidance scale (default: 7.5)',
        })
        .option('count', { type: 'number', description: 'Number of results (default: 4)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    imageOutpainting
  )

  .command(
    'image:magic-inpaint',
    'Place an object or subject into a scene using AI',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('prompt', {
          type: 'string',
          description: 'Describe the scene/object placement',
          demandOption: true,
        })
        .option('scale', { type: 'number', description: 'Scale (default: 2)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    magicInpaint
  )

  .command(
    'image:pix-to-pix',
    'Transform an image using a text prompt',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('prompt', {
          type: 'string',
          description: 'Transformation prompt',
          demandOption: true,
        })
        .option('guidance-scale', {
          type: 'number',
          description: 'Image guidance scale (default: 1)',
        })
        .option('count', { type: 'number', description: 'Number of results (default: 4)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    pixToPix
  )

  .command(
    'image:replace',
    'Replace image background with transparent, a color, or another image',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Image URL', demandOption: true })
        .option('replace-type', {
          type: 'string',
          choices: ['transparent', 'image', 'color'] as const,
          description: 'Replacement type',
          demandOption: true,
        })
        .option('replace-color', {
          type: 'string',
          description: 'Hex color (e.g. #ff0000) — used with replace-type=color',
        })
        .option('replace-image', {
          type: 'string',
          description: 'Background image URL — used with replace-type=image',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    replaceImage
  )

  .command(
    'image:sd-scribble',
    'Generate image from a sketch/scribble using Stable Diffusion',
    (y: Argv) =>
      y
        .option('prompt', {
          type: 'string',
          description: 'Generation prompt',
          demandOption: true,
        })
        .option('negative-prompt', {
          type: 'string',
          description: 'Things to avoid',
          demandOption: true,
        })
        .option('url', { type: 'string', description: 'Scribble/sketch image URL' })
        .option('resolution', { type: 'number', description: 'Image resolution' })
        .option('steps', { type: 'number', description: 'Diffusion steps' })
        .option('guidance-scale', { type: 'number', description: 'Guidance scale' })
        .option('count', { type: 'number', description: 'Number of results (default: 4)' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    sdScribble
  )

  .command(
    'image:task',
    'Check the status of an async image processing task',
    (y: Argv) =>
      y.option('id', {
        type: 'string',
        description: 'Task ID returned by an async image command',
        demandOption: true,
      }),
    getTask
  )

  .demandCommand(1, 'You need to provide a command. Run --help for usage.')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .argv;
