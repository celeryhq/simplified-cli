import { getConfig } from '../config';
import { SimplifiedAPI } from '../api';
import { submitAndMaybeWait, pollAiImageStatus } from '../polling';

// ── Commands ─────────────────────────────────────────────────────────────────

export async function blurBackground(args: {
  url: string;
  blur: number;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.blurBackground({ image_url: args.url, blur_value: args.blur });
    console.log('🖼️  Background blurred:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function convertImageFormat(args: {
  url: string;
  format?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.convertImageFormat({ image_url: args.url, output_format: args.format as any }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function generativeFill(args: {
  url: string;
  prompt: string;
  'mask-url'?: string;
  'negative-prompt'?: string;
  count?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.generativeFill({
          image_url: args.url,
          prompt: args.prompt,
          mask_url: args['mask-url'],
          negative_prompt: args['negative-prompt'],
          count: args.count,
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function imageOutpainting(args: {
  url: string;
  'mask-url': string;
  prompt: string;
  'negative-prompt'?: string;
  'guidance-scale'?: number;
  count?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.imageOutpainting({
          image_url: args.url,
          mask_url: args['mask-url'],
          prompt: args.prompt,
          negative_prompt: args['negative-prompt'],
          guidance_scale: args['guidance-scale'],
          count: args.count,
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function upscaleImage(args: {
  url: string;
  scale?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.upscaleImage({ image_url: args.url, scale: args.scale as any }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function magicInpaint(args: {
  url: string;
  prompt: string;
  scale?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.magicInpaint({ image_url: args.url, prompt: args.prompt, scale: args.scale }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function pixToPix(args: {
  url: string;
  prompt: string;
  'guidance-scale'?: number;
  count?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.pixToPix({
          image_url: args.url,
          prompt: args.prompt,
          image_guidance_scale: args['guidance-scale'],
          counts: args.count,
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function removeBackground(args: {
  url: string;
  'magic-crop'?: boolean;
  'bg-color'?: string;
  format?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.removeBackground({
          image_url: args.url,
          magic_crop: args['magic-crop'],
          background_color: args['bg-color'],
          output_format: args.format as any,
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function replaceImage(args: {
  url: string;
  'replace-type': string;
  'replace-color'?: string;
  'replace-image'?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.replaceImage({
          image_url: args.url,
          replace_type: args['replace-type'] as any,
          replace_color: args['replace-color'],
          replace_image: args['replace-image'],
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function restoreImage(args: {
  url: string;
  scale?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () => api.restoreImage({ image_url: args.url, scale: args.scale }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function sdScribble(args: {
  prompt: string;
  'negative-prompt': string;
  url?: string;
  resolution?: number;
  steps?: number;
  'guidance-scale'?: number;
  count?: number;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    await submitAndMaybeWait(
      api,
      () =>
        api.sdScribble({
          prompt: args.prompt,
          negative_prompt: args['negative-prompt'],
          image_url: args.url,
          image_resolution: args.resolution,
          steps: args.steps,
          guidance_scale: args['guidance-scale'],
          counts: args.count,
        }),
      args.wait,
      'image'
    );
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function generateAiImage(args: {
  model: string;
  capability: string;
  prompt: string;
  'aspect-ratio'?: string;
  count?: number;
  'negative-prompt'?: string;
  'reference-images'?: string;
  seed?: number;
  properties?: string;
  wait: boolean;
}) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const referenceImages = args['reference-images']
      ? args['reference-images'].split(',').map((s) => s.trim())
      : undefined;
    const properties = args.properties
      ? args.properties.split(',').map((s) => s.trim())
      : undefined;

    const result = await api.generateAiImage({
      model: args.model,
      capability: args.capability as 'prompt' | 'reference_image' | 'multiple_images',
      parameters: {
        prompt: args.prompt,
        aspect_ratio: args['aspect-ratio'],
        count: args.count,
        negative_prompt: args['negative-prompt'],
        reference_images: referenceImages,
        seed: args.seed,
      },
      properties,
    });

    if (!args.wait) {
      console.log(JSON.stringify(result, null, 2));
      console.error(`\n💡 To check status: simplified ai-image:status --id ${result.art_variation_id}`);
      return;
    }

    const images = await pollAiImageStatus(api, result.art_variation_id);
    console.log(JSON.stringify(images, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function getAiImageStatus(args: { id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.getAiImageStatus(args.id);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function listAiImageModels(args: { 'model-id'?: string; capability?: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.listAiImageModels({
      model_id: args['model-id'],
      capability: args.capability,
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function getTask(args: { id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.getTask(args.id);
    console.log('📋 Task status:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
