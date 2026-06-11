import { getConfig } from '../config';
import { SimplifiedAPI, VideoStorageMode } from '../api';
import { pollAiVideoStatus } from '../polling';
import { parseList } from './_shared';

/**
 * Assemble the V2 generation `parameters` object: common flags form the base,
 * then the `--parameters` JSON escape hatch is merged on top so explicit JSON
 * wins on key collisions. Kept pure for testing. Throws on malformed JSON.
 */
export function buildVideoParameters(
  flags: {
    prompt: string;
    'aspect-ratio'?: string;
    duration?: number;
    resolution?: string;
    'negative-prompt'?: string;
    'reference-images'?: string;
    'generate-audio'?: boolean;
  },
  extraJson?: string
): Record<string, unknown> {
  const params: Record<string, unknown> = { prompt: flags.prompt };
  if (flags['aspect-ratio'] !== undefined) params.aspect_ratio = flags['aspect-ratio'];
  if (flags.duration !== undefined) params.duration = flags.duration;
  if (flags.resolution !== undefined) params.resolution = flags.resolution;
  if (flags['negative-prompt'] !== undefined) params.negative_prompt = flags['negative-prompt'];
  if (flags['generate-audio'] !== undefined) params.generate_audio = flags['generate-audio'];
  if (flags['reference-images']) params.reference_images = parseList(flags['reference-images']);

  if (extraJson) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(extraJson) as Record<string, unknown>;
    } catch {
      throw new Error('--parameters must be valid JSON');
    }
    Object.assign(params, parsed);
  }
  return params;
}

export async function generateAiVideo(args: {
  model: string;
  capability: string;
  prompt: string;
  'aspect-ratio'?: string;
  duration?: number;
  resolution?: string;
  'negative-prompt'?: string;
  'reference-images'?: string;
  'generate-audio'?: boolean;
  parameters?: string;
  storage?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const parameters = buildVideoParameters(args, args.parameters);

    const result = await api.generateVideoV2({
      model: args.model,
      capability: args.capability,
      parameters,
      storage: args.storage as VideoStorageMode | undefined,
    });

    if (!args.wait) {
      console.log(JSON.stringify(result, null, 2));
      console.error(
        `\n💡 To check status: simplified ai-video:status --art-id ${result.id} --id ${result.art_variation_id}`
      );
      return;
    }

    const output = await pollAiVideoStatus(api, result.id, result.art_variation_id);
    console.log(JSON.stringify(output, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function getAiVideoStatus(args: { id: string; 'art-id': string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.getVideoVariation(args['art-id'], args.id);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function listAiVideoModels(args: { 'model-id'?: string; capability?: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.getModelFields({
      type: 'video',
      model_id: args['model-id'],
      capability: args.capability,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
