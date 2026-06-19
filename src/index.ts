import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';
import figlet from 'figlet';

function printBanner() {
  const lines = figlet.textSync('SIMPLIFIED', { font: 'ANSI Shadow' }).split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  // #FFAD00 — Simplified brand yellow
  const yellow = '\x1b[38;2;255;173;0m';
  const reset = '\x1b[0m';
  nonEmpty.forEach(line => process.stdout.write(yellow + line + reset + '\n'));
  console.log(`${yellow}  Create, schedule, publish and analyze — all in one place${reset}\n`);
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
import { createReviewBundle, addDraftsToReviewBundle } from './commands/reviewbundle';
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
  generateAiImage,
  getAiImageStatus,
  listAiImageModels,
} from './commands/image';
import {
  addBRolls,
  convertVideoFormat,
  mergeVideos,
  removeAudio,
  reverseVideo,
  scriptToVideo,
  textToVideo,
  speedupVideo,
  getVideoTask,
} from './commands/video';
import { VIDEO_OUTPUT_FORMATS, VIDEO_TONES, VIDEO_FORMATS, VIDEO_GEN_CAPABILITIES, VIDEO_STORAGE_MODES } from './api';
import { generateAiVideo, getAiVideoStatus, listAiVideoModels } from './commands/aivideo';
import { uploadAsset, importAsset, getAsset } from './commands/assets';
import { setApiKeyOverride, setTeamspaceOverride } from './config';
import {
  teamspaceCurrent,
  teamspaceUse,
  teamspaceAdd,
  teamspaceList,
  teamspaceRemove,
} from './commands/teamspace';
import { whoami, login, use as authUse, list as authList, logout } from './commands/auth';
import {
  brandkitList,
  brandkitCreate,
  brandkitGet,
  brandkitBrandbook,
  brandkitBuild,
  brandkitImport,
  contextList,
  contextCreate,
  contextUpdate,
  contextDelete,
  contextGet,
  contextGetByType,
} from './commands/brandkit';
import {
  projectsList,
  projectsCreate,
  projectsGet,
  projectsDelete,
  projectsExport,
  itemList,
  itemCreate,
  itemGet,
  itemDelete,
  itemAssignAgent,
  itemReorder,
} from './commands/projects';

const videoGenerationOptions = (y: Argv) =>
  y
    .option('title', { type: 'string', description: 'Video title', demandOption: true })
    .option('description', { type: 'string', description: 'Video description' })
    .option('keywords', { type: 'string', description: 'Keywords for content generation' })
    .option('tone', {
      type: 'string',
      choices: VIDEO_TONES,
      description: 'Video tone',
    })
    .option('creativity-level', { type: 'number', description: 'Creativity level' })
    .option('language-code', { type: 'string', description: 'Language code (e.g. en)' })
    .option('voice-id', { type: 'string', description: 'Voice ID for narration' })
    .option('format', {
      type: 'string',
      choices: VIDEO_FORMATS,
      description: 'Video format',
    })
    .option('no-runs', { type: 'number', description: 'Number of runs' })
    .option('logo-id', { type: 'string', description: 'Logo ID' })
    .option('caption-style-id', { type: 'string', description: 'Caption style ID' })
    .option('should-export', {
      type: 'boolean',
      default: true,
      description: 'Export after generation',
    })
    .option('wait', {
      type: 'boolean',
      default: false,
      description: 'Poll until task completes (including export) and print result',
    });

const CONTEXT_TYPES = [
  'brand_voice', 'style_guide', 'seo_guidelines', 'internal_links', 'target_keywords',
  'features', 'competitor_analysis', 'writing_examples', 'cro_best_practices',
  'company_research', 'brand_profile', 'market_positioning', 'icps', 'usps',
  'content_pillars', 'marketing_strategy',
] as const;

const argv = hideBin(process.argv);
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  printBanner();
}

yargs(argv)
  .scriptName('simplified')
  .usage('$0 <command> [options]')
  .option('teamspace', {
    type: 'string',
    description: 'Teamspace id or saved alias for this command (overrides env and saved context)',
    global: true,
  })
  .option('api-key', {
    type: 'string',
    description: 'API key for this command (overrides the active profile and SIMPLIFIED_API_KEY)',
    global: true,
  })
  .middleware((a) => {
    setTeamspaceOverride(a.teamspace as string | undefined);
    setApiKeyOverride(a['api-key'] as string | undefined);
  })

  // ── Accounts ──────────────────────────────────────────────────────────────
  .command(
    'accounts:list',
    'List connected social media accounts',
    (y: Argv) =>
      y.option('network', {
        alias: 'n',
        type: 'string',
        description:
          'Filter by platform: facebook | instagram | linkedin | tiktok | tiktokBusiness | youtube | pinterest | threads | google | bluesky | mastodon | reddit',
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
        .option('group', {
          type: 'boolean',
          description: 'Group 2+ accounts into a single grouped post (one card) instead of separate posts',
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
        .example(
          '$0 posts:create -c "Multi-platform" -a "123,456" --action draft --group',
          'Create one grouped draft across accounts'
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

  // ── Review Bundle: Create ──────────────────────────────────────────────────
  .command(
    'review-bundle:create',
    'Create a social media review bundle, optionally seeded with drafts',
    (y: Argv) =>
      y
        .option('title', {
          alias: 't',
          type: 'string',
          description: 'Review bundle title',
          demandOption: true,
        })
        .option('description', {
          type: 'string',
          description: 'Optional description shown to reviewers',
        })
        .option('draft-ids', {
          type: 'string',
          description: 'Comma-separated draft IDs to seed the bundle with',
        })
        .example(
          '$0 review-bundle:create -t "April campaign — round 1"',
          'Create an empty review bundle'
        )
        .example(
          '$0 review-bundle:create -t "April campaign" --draft-ids "draft-1,draft-2"',
          'Create a bundle seeded with drafts'
        ),
    createReviewBundle
  )

  // ── Review Bundle: Add Drafts ──────────────────────────────────────────────
  .command(
    'review-bundle:add-drafts',
    'Add drafts to an existing review bundle',
    (y: Argv) =>
      y
        .option('bundle-id', {
          type: 'string',
          description: 'ID of the existing review bundle',
          demandOption: true,
        })
        .option('draft-ids', {
          type: 'string',
          description: 'Comma-separated draft IDs to add (at least one)',
          demandOption: true,
        })
        .example(
          '$0 review-bundle:add-drafts --bundle-id "abc123" --draft-ids "draft-3,draft-4"',
          'Append drafts to a bundle'
        ),
    addDraftsToReviewBundle
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

  // ── AI Image Generation ───────────────────────────────────────────────────
  .command(
    'ai-image:generate',
    'Generate an image using AI from a text prompt or reference image',
    (y: Argv) =>
      y
        .option('model', {
          type: 'string',
          description: 'Model ID (e.g. flux.flux-realism, google.imagen-4.0-generate-001, openai.imgen)',
          demandOption: true,
        })
        .option('capability', {
          type: 'string',
          choices: ['prompt', 'reference_image', 'multiple_images'],
          description: 'Generation mode',
          default: 'prompt',
        })
        .option('prompt', {
          type: 'string',
          description: 'Text description of the image to generate',
          demandOption: true,
        })
        .option('aspect-ratio', {
          type: 'string',
          description: 'Aspect ratio (e.g. 1:1, 16:9, 9:16)',
        })
        .option('count', {
          type: 'number',
          description: 'Number of images to generate (1-4, default: 1)',
        })
        .option('negative-prompt', {
          type: 'string',
          description: 'What NOT to include in the image',
        })
        .option('reference-images', {
          type: 'string',
          description: 'Comma-separated asset UUIDs (required for reference_image / multiple_images)',
        })
        .option('seed', {
          type: 'number',
          description: 'Random seed for reproducible results',
        })
        .option('properties', {
          type: 'string',
          description: 'Comma-separated style slugs (e.g. cinematic,photography)',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until generation completes and print image URLs',
        })
        .example(
          '$0 ai-image:generate --model flux.flux-realism --prompt "sunset over mountains" --aspect-ratio 16:9 --wait',
          'Text to image'
        )
        .example(
          '$0 ai-image:generate --model flux.flux-kontext-pro --capability reference_image --prompt "watercolor style" --reference-images "uuid-here" --wait',
          'Style transfer from reference image'
        ),
    generateAiImage
  )

  .command(
    'ai-image:status',
    'Check the status of an AI image generation task',
    (y: Argv) =>
      y.option('id', {
        type: 'string',
        description: 'art_variation_id returned by ai-image:generate',
        demandOption: true,
      }),
    getAiImageStatus
  )

  .command(
    'ai-image:models',
    'List available AI image generation models with capabilities and pricing',
    (y: Argv) =>
      y
        .option('model-id', {
          type: 'string',
          description: 'Filter by model ID (e.g. flux.flux-realism)',
        })
        .option('capability', {
          type: 'string',
          choices: ['prompt', 'reference_image', 'multiple_images'] as const,
          description: 'Filter by capability',
        })
        .example('$0 ai-image:models', 'List all models')
        .example('$0 ai-image:models --capability prompt', 'Only text-to-image models')
        .example('$0 ai-image:models --model-id flux.flux-realism --capability prompt', 'Full field definitions'),
    listAiImageModels
  )

  // ── AI Video Generation (V2) ──────────────────────────────────────────────
  .command(
    'ai-video:generate',
    'Generate an AI video from a prompt or reference image (Veo, Sora, Kling, etc.)',
    (y: Argv) =>
      y
        .option('model', {
          type: 'string',
          description: 'Model ID (e.g. veo-3, veo-3.1, sora-2, kling-v2.5-turbo-pro). Run ai-video:models to list.',
          demandOption: true,
        })
        .option('capability', {
          type: 'string',
          // Not restricted via choices: capabilities are per-model and the backend validates.
          description: `Generation mode (per-model): ${VIDEO_GEN_CAPABILITIES.join(' | ')}`,
          default: 'prompt',
        })
        .option('prompt', {
          type: 'string',
          description: 'Text description of the video to generate',
          demandOption: true,
        })
        .option('aspect-ratio', { type: 'string', description: 'Aspect ratio (e.g. 16:9, 9:16, 1:1)' })
        .option('duration', { type: 'number', description: 'Video length in seconds (model-specific, e.g. 4/6/8)' })
        .option('resolution', { type: 'string', description: 'Resolution (model-specific, e.g. 720p, 1080p)' })
        .option('negative-prompt', { type: 'string', description: 'What NOT to include in the video' })
        .option('reference-images', {
          type: 'string',
          description: 'Comma-separated asset UUIDs (for reference_image / multiple_images / first_last_frame)',
        })
        .option('generate-audio', { type: 'boolean', description: 'Generate audio track (model-specific)' })
        .option('parameters', {
          type: 'string',
          description: 'JSON of extra model-specific parameters, merged over the flags (e.g. \'{"first_frame_url":"<uuid>"}\')',
        })
        .option('storage', {
          type: 'string',
          choices: VIDEO_STORAGE_MODES,
          description: 'asset = persist a reusable asset; transient = temporary; default = gallery',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until generation completes and print the output (file_url, asset id)',
        })
        .example(
          '$0 ai-video:generate --model veo-3-fast --prompt "drone shot over a neon city at night" --aspect-ratio 16:9 --duration 8 --storage asset --wait',
          'Text to video'
        )
        .example(
          '$0 ai-video:generate --model veo-3.1 --capability first_last_frame --prompt "morph between scenes" --parameters \'{"first_frame_url":"<uuid>","last_frame_url":"<uuid>"}\' --wait',
          'First/last frame video'
        ),
    generateAiVideo
  )

  .command(
    'ai-video:status',
    'Check the status of an AI video generation job',
    (y: Argv) =>
      y
        .option('art-id', {
          type: 'string',
          description: 'The "id" returned by ai-video:generate (the art id)',
          demandOption: true,
        })
        .option('id', {
          type: 'string',
          description: 'The "art_variation_id" returned by ai-video:generate (the variation id)',
          demandOption: true,
        }),
    getAiVideoStatus
  )

  .command(
    'ai-video:models',
    'List available AI video models with capabilities and per-model fields',
    (y: Argv) =>
      y
        .option('model-id', { type: 'string', description: 'Filter to one model (e.g. veo-3)' })
        .option('capability', {
          type: 'string',
          description: `Show the full field schema for this capability: ${VIDEO_GEN_CAPABILITIES.join(' | ')}`,
        })
        .example('$0 ai-video:models', 'List all video models')
        .example('$0 ai-video:models --model-id veo-3 --capability prompt', 'Full field definitions for a model'),
    listAiVideoModels
  )

  // ── Video Tools ──────────────────────────────────────────────────────────
  .command(
    'video:add-b-rolls',
    'Add B-rolls to a video',
    (y: Argv) =>
      y
        .option('title', { type: 'string', description: 'Video title', demandOption: true })
        .option('media-url', { type: 'string', description: 'Media URL' })
        .option('asset', { type: 'string', description: 'Asset identifier' })
        .option('language-code', { type: 'string', description: 'Language code (e.g. en)' })
        .option('should-export', { type: 'boolean', description: 'Export after processing' })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    addBRolls
  )

  .command(
    'video:convert',
    'Convert a video to a different format',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Video URL', demandOption: true })
        .option('format', {
          type: 'string',
          choices: VIDEO_OUTPUT_FORMATS,
          description: 'Output format (default: mp4)',
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    convertVideoFormat
  )

  .command(
    'video:merge',
    'Merge multiple videos into one',
    (y: Argv) =>
      y
        .option('urls', {
          type: 'string',
          description: 'Comma-separated video URLs (min 2)',
          demandOption: true,
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    mergeVideos
  )

  .command(
    'video:remove-audio',
    'Remove audio track from a video',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Video URL', demandOption: true })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    removeAudio
  )

  .command(
    'video:reverse',
    'Reverse a video',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Video URL', demandOption: true })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    reverseVideo
  )

  .command('video:script-to-video', 'Generate a video from a script using AI', videoGenerationOptions, scriptToVideo)
  .command('video:text-to-video', 'Generate a video from text using AI', videoGenerationOptions, textToVideo)

  .command(
    'video:speedup',
    'Speed up or slow down a video',
    (y: Argv) =>
      y
        .option('url', { type: 'string', description: 'Video URL', demandOption: true })
        .option('playbackrate', {
          type: 'number',
          description: 'Playback rate (min 0.5)',
          demandOption: true,
        })
        .option('wait', {
          type: 'boolean',
          default: false,
          description: 'Poll until task completes and print result',
        }),
    speedupVideo
  )

  .command(
    'video:task',
    'Check the status of an async video processing task',
    (y: Argv) =>
      y.option('id', {
        type: 'string',
        description: 'Task ID returned by a video command',
        demandOption: true,
      }),
    getVideoTask
  )

  // ── Assets ────────────────────────────────────────────────────────────────
  .command(
    'assets:get',
    'Get asset details by ID',
    (y: Argv) =>
      y.option('id', {
        alias: 'i',
        type: 'string',
        description: 'Asset UUID',
        demandOption: true,
      }),
    getAsset
  )

  .command(
    'assets:upload',
    'Upload a local file as a workspace asset (image, video, audio, PDF)',
    (y: Argv) =>
      y
        .option('file', {
          alias: 'f',
          type: 'string',
          description: 'Path to the local file to upload',
          demandOption: true,
        })
        .option('name', {
          alias: 'n',
          type: 'string',
          description: 'Display name for the asset (defaults to filename)',
        }),
    uploadAsset
  )

  .command(
    'assets:import',
    'Import a remote URL (S3, GCP, CDN) as a workspace asset',
    (y: Argv) =>
      y
        .option('url', {
          alias: 'u',
          type: 'string',
          description: 'Public URL of the file to import',
          demandOption: true,
        })
        .option('name', {
          alias: 'n',
          type: 'string',
          description: 'Display name for the asset',
        }),
    importAsset
  )

  // ── Teamspace context ───────────────────────────────────────────────────────
  .command(
    'teamspace:current',
    'Show the active teamspace context and where it came from',
    (y: Argv) => y,
    () => teamspaceCurrent()
  )
  .command(
    'teamspace:use <target>',
    'Switch the active teamspace (id, saved alias, or "default" for the default workspace)',
    (y: Argv) =>
      y.positional('target', {
        type: 'string',
        describe: 'Teamspace id, saved alias, or "default"',
        demandOption: true,
      }),
    (a) => teamspaceUse({ target: a.target as string })
  )
  .command(
    'teamspace:add <alias> <id>',
    'Save an alias for a teamspace id',
    (y: Argv) =>
      y
        .positional('alias', { type: 'string', describe: 'Short alias', demandOption: true })
        .positional('id', { type: 'string', describe: 'Teamspace id', demandOption: true }),
    (a) => teamspaceAdd({ alias: a.alias as string, id: a.id as string })
  )
  .command(
    'teamspace:list',
    'List saved teamspace aliases and mark the active one',
    (y: Argv) => y,
    () => teamspaceList()
  )
  .command(
    'teamspace:remove <alias>',
    'Remove a saved teamspace alias',
    (y: Argv) =>
      y.positional('alias', { type: 'string', describe: 'Alias to remove', demandOption: true }),
    (a) => teamspaceRemove({ alias: a.alias as string })
  )

  // ── Auth ─────────────────────────────────────────────────────────────────────
  .command(
    'auth:whoami',
    'Show the default workspace and teamspaces accessible to the current token',
    (y: Argv) => y,
    () => whoami()
  )
  .command(
    'auth:login <name>',
    'Save an API key under a profile name and make it the active key',
    (y: Argv) =>
      y.positional('name', { type: 'string', describe: 'Profile name', demandOption: true }),
    (a) => login(a.name as string, a['api-key'] as string | undefined)
  )
  .command(
    'auth:use <name>',
    'Switch the active API key profile',
    (y: Argv) =>
      y.positional('name', { type: 'string', describe: 'Profile name', demandOption: true }),
    (a) => authUse(a.name as string)
  )
  .command(
    'auth:list',
    'List saved API key profiles and mark the active one',
    (y: Argv) => y,
    () => authList()
  )
  .command(
    'auth:logout [name]',
    'Remove an API key profile (defaults to the active one)',
    (y: Argv) => y.positional('name', { type: 'string', describe: 'Profile name to remove' }),
    (a) => logout(a.name as string | undefined)
  )

  // ── Brand Kits ──────────────────────────────────────────────────────────────
  .command(
    'brandkit:list',
    'List brand kits in the workspace',
    (y: Argv) => y.option('search', { type: 'string', description: 'Filter brand kits by title' }),
    brandkitList
  )
  .command(
    'brandkit:create',
    'Create a brand kit (only --title is required)',
    (y: Argv) =>
      y
        .option('title', { type: 'string', description: 'Brand name (required unless --json)' })
        .option('description', { type: 'string', description: 'Short brand description' })
        .option('social-links', { type: 'string', description: 'JSON array of {type,url} link objects' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 brandkit:create --title "Velle Studio"', 'Create a brand kit'),
    brandkitCreate
  )
  .command(
    'brandkit:get',
    'Get a brand kit by id',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('expand', { type: 'string', description: 'Comma-separated expansions: extra, website' })
        .option('fields', { type: 'string', description: 'Comma-separated top-level keys to include' })
        .option('omit', { type: 'string', description: 'Comma-separated top-level keys to exclude' })
        .example('$0 brandkit:get --brand <id> --expand extra,website', 'Full brand envelope'),
    brandkitGet
  )
  .command(
    'brandkit:brandbook',
    'Get brand book data (optimized for AI/integrations)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('elements', {
          type: 'string',
          description: 'Comma-separated elements (e.g. brief,voices,colors,fonts,logos,usps,icps). Omit for base data only.',
        })
        .example('$0 brandkit:brandbook --brand <id> --elements "brief,voices,colors"', 'Selected elements'),
    brandkitBrandbook
  )
  .command(
    'brandkit:build',
    'Populate a brand kit with a canonical BrandKitDocument (brand, social_links, style)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('json', { type: 'string', description: 'Path to JSON file with the document body' })
        .option('data', { type: 'string', description: 'Inline JSON document body (alternative to --json)' })
        .example('$0 brandkit:build --brand <id> --json style.json', 'Build from a file'),
    brandkitBuild
  )
  .command(
    'brandkit:import',
    'Import brand kit modules (brand_voice, icps, usps, …)',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('json', { type: 'string', description: 'Path to JSON file with module data' })
        .option('data', { type: 'string', description: 'Inline JSON module data (alternative to --json)' })
        .example('$0 brandkit:import --brand <id> --json modules.json', 'Import modules from a file'),
    brandkitImport
  )

  // ── Brand Context Documents ──────────────────────────────────────────────────
  .command(
    'brandkit:context-list',
    'List context documents linked to a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('canonical-key', { type: 'string', description: 'Filter by canonical type key (e.g. brand_voice)' })
        .option('search', { type: 'string', description: 'Search by document name or type' })
        .option('ordering', {
          type: 'string',
          choices: ['created', '-created', 'modified', '-modified'] as const,
          description: 'Sort order (default: -modified)',
        }),
    contextList
  )
  .command(
    'brandkit:context-create',
    'Create or link a context document on a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('document-id', { type: 'string', description: 'Link an existing KnowledgeDoc by UUID' })
        .option('doc-type', { type: 'string', description: 'Type key for inline creation (e.g. brand_voice)' })
        .option('name', { type: 'string', description: 'Document name (inline creation)' })
        .option('description', { type: 'string', description: 'Document description' })
        .option('content', { type: 'string', description: 'Markdown content (inline)' })
        .option('content-file', { type: 'string', description: 'Path to a markdown file (alternative to --content)' })
        .option('data', { type: 'string', description: 'Inline JSON structured data' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 brandkit:context-create --brand <id> --doc-type brand_voice --name "Voice" --content-file voice.md', 'Inline creation')
        .example('$0 brandkit:context-create --brand <id> --document-id <docId>', 'Link an existing doc'),
    contextCreate
  )
  .command(
    'brandkit:context-update',
    'Update a linked context document',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('link', { type: 'string', description: 'Context document link UUID', demandOption: true })
        .option('name', { type: 'string', description: 'New document name' })
        .option('description', { type: 'string', description: 'New description' })
        .option('content', { type: 'string', description: 'New markdown content (inline)' })
        .option('content-file', { type: 'string', description: 'Path to a markdown file (alternative to --content)' })
        .option('data', { type: 'string', description: 'Inline JSON structured data' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' }),
    contextUpdate
  )
  .command(
    'brandkit:context-delete',
    'Delete a context document link from a brand kit',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('link', { type: 'string', description: 'Context document link UUID', demandOption: true }),
    contextDelete
  )
  .command(
    'brandkit:context-get',
    'Get a single context document by its link UUID or KnowledgeDoc UUID',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('link', {
          type: 'string',
          description: 'Context document link UUID or underlying KnowledgeDoc UUID',
          demandOption: true,
        }),
    contextGet
  )
  .command(
    'brandkit:context-get-by-type',
    'Get a single context document by its canonical type',
    (y: Argv) =>
      y
        .option('brand', { type: 'string', description: 'Brand kit UUID', demandOption: true })
        .option('type', {
          type: 'string',
          choices: CONTEXT_TYPES,
          description: 'Canonical type key',
          demandOption: true,
        }),
    contextGetByType
  )

  // ── Projects ──────────────────────────────────────────────────────────────
  .command(
    'projects:list',
    'List projects of a given resourcetype',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype (e.g. pm, blogger, ad)', demandOption: true })
        .option('primary-type', { type: 'string', description: 'Filter by primary type' })
        .option('ordering', { type: 'string', description: 'Field to order results by' })
        .option('search', { type: 'string', description: 'Search term' })
        .example('$0 projects:list --type blogger', 'List blogger projects'),
    projectsList
  )
  .command(
    'projects:create',
    'Create a project of a given resourcetype',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('title', { type: 'string', description: 'Project title' })
        .option('description', { type: 'string', description: 'Project description' })
        .option('primary-type', { type: 'string', description: 'Project category string' })
        .option('data', { type: 'string', description: 'Inline JSON for the project data field' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .example('$0 projects:create --type pm --title "Q3 Campaign"', 'Create a project'),
    projectsCreate
  )
  .command(
    'projects:get',
    'Get a project by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('id', { type: 'string', description: 'Project id', demandOption: true }),
    projectsGet
  )
  .command(
    'projects:delete',
    'Soft-delete a project by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('id', { type: 'string', description: 'Project id', demandOption: true }),
    projectsDelete
  )
  .command(
    'projects:export',
    'Export project items to a partner integration',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Project id', demandOption: true })
        .option('partner-id', { type: 'number', description: 'Partner integration id', demandOption: true })
        .option('item-ids', { type: 'string', description: 'Comma-separated ProjectItem UUIDs', demandOption: true })
        .example('$0 projects:export --type pm --project <id> --partner-id 123 --item-ids "uuid1,uuid2"', 'Export items'),
    projectsExport
  )

  // ── Project Items ─────────────────────────────────────────────────────────
  .command(
    'projects:item-list',
    'List items within a project',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('primary-type', { type: 'string', description: 'Filter by primary type' })
        .option('ordering', { type: 'string', description: 'Field to order results by' })
        .option('search', { type: 'string', description: 'Search term' }),
    itemList
  )
  .command(
    'projects:item-create',
    'Create an item within a project',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('title', { type: 'string', description: 'Item title' })
        .option('description', { type: 'string', description: 'Item description' })
        .option('primary-type', { type: 'string', description: 'Item category string' })
        .option('data', { type: 'string', description: 'Inline JSON for the item data field' })
        .option('json', { type: 'string', description: 'Path to JSON file with the full body' })
        .option('start-date', { type: 'string', description: 'Start date (ISO 8601)' })
        .option('due-date', { type: 'string', description: 'Due date (ISO 8601)' })
        .option('status', { type: 'string', description: 'Status string (max 16 chars)' })
        .option('priority', { type: 'number', description: 'Priority level (default 0)' }),
    itemCreate
  )
  .command(
    'projects:item-get',
    'Get a project item by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true }),
    itemGet
  )
  .command(
    'projects:item-delete',
    'Soft-delete a project item by id',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true }),
    itemDelete
  )
  .command(
    'projects:item-assign-agent',
    'Assign an AI agent to a project item',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true })
        .option('agent-id', { type: 'string', description: 'Agent (Chatbot) UUID', demandOption: true }),
    itemAssignAgent
  )
  .command(
    'projects:item-reorder',
    'Move a project item to a new position',
    (y: Argv) =>
      y
        .option('type', { type: 'string', description: 'Project resourcetype', demandOption: true })
        .option('project', { type: 'string', description: 'Parent project id', demandOption: true })
        .option('id', { type: 'string', description: 'Item id', demandOption: true })
        .option('position', { type: 'number', description: 'New position index', demandOption: true }),
    itemReorder
  )

  .demandCommand(1, 'You need to provide a command. Run --help for usage.')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .argv;
