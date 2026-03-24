import { getConfig } from '../config';
import { SimplifiedAPI, ScriptToVideoPayload } from '../api';
import { submitAndMaybeWait, submitAndMaybeWaitWithExport, VIDEO_POLL_TIMEOUT_MS } from '../polling';

// ── Commands ─────────────────────────────────────────────────────────────────

export async function addBRolls(args: {
  title: string;
  'media-url'?: string;
  asset?: string;
  'language-code'?: string;
  'should-export'?: boolean;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.addBRollsVideo({
          title: args.title,
          media_url: args['media-url'],
          asset: args.asset,
          language_code: args['language-code'],
          should_export: args['should-export'],
        }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function convertVideoFormat(args: {
  url: string;
  format?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.convertVideoFormat({
          video_url: args.url,
          output_format: args.format as any,
        }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function mergeVideos(args: {
  urls: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const urlList = args.urls.split(',').map((u) => u.trim());
    if (urlList.length < 2) {
      console.error('❌ At least 2 video URLs are required for merging');
      process.exit(1);
    }
    await submitAndMaybeWait(
      api,
      () => api.mergeVideos({ video_urls: urlList }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function removeAudio(args: {
  url: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.removeAudio({ video_url: args.url }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function reverseVideo(args: {
  url: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.reverseVideo({ video_url: args.url }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

interface GenerateVideoArgs {
  title: string;
  description?: string;
  keywords?: string;
  tone?: string;
  'creativity-level'?: number;
  'language-code'?: string;
  'voice-id'?: string;
  format?: string;
  'no-runs'?: number;
  'logo-id'?: string;
  'caption-style-id'?: string;
  'should-export'?: boolean;
  wait: boolean;
}

function buildGenerateVideoPayload(args: GenerateVideoArgs): ScriptToVideoPayload {
  return {
    payload: {
      title: args.title,
      description: args.description,
      keywords: args.keywords,
      tone: args.tone as any,
      creativity_level: args['creativity-level'],
      language_code: args['language-code'],
      voice_id: args['voice-id'],
      format: args.format as any,
      no_runs: args['no-runs'],
      logo_id: args['logo-id'],
      caption_style_id: args['caption-style-id'],
    },
    should_export: args['should-export'] ?? true,
  };
}

export async function scriptToVideo(args: GenerateVideoArgs) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWaitWithExport(
      api,
      () => api.scriptToVideo(buildGenerateVideoPayload(args)),
      args.wait,
      'video'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function textToVideo(args: GenerateVideoArgs) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWaitWithExport(
      api,
      () => api.textToVideo(buildGenerateVideoPayload(args)),
      args.wait,
      'video'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function speedupVideo(args: {
  url: string;
  playbackrate: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    if (args.playbackrate < 0.5) {
      console.error('❌ Playback rate must be at least 0.5');
      process.exit(1);
    }
    await submitAndMaybeWait(
      api,
      () =>
        api.speedupVideo({
          video_url: args.url,
          playback_rate: args.playbackrate,
        }),
      args.wait,
      'video',
      VIDEO_POLL_TIMEOUT_MS
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function getVideoTask(args: { id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const [result, progress] = await Promise.all([
      api.getTask(args.id),
      api.getTaskProgress(args.id).catch(() => null),
    ]);

    console.log('📋 Task status:');
    console.log(JSON.stringify(result, null, 2));

    if (progress?.info) {
      console.log('\n📊 Progress:');
      console.log(JSON.stringify(progress, null, 2));
    }
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
