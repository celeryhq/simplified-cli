import fetch from 'node-fetch';
import { SimplifiedConfig } from './config';

export interface CreatePostRequest {
  message: string;
  account_ids: string[];
  action: 'schedule' | 'add_to_queue' | 'draft';
  date?: string;
  media?: string[];
  additional?: Record<string, unknown>;
}

export interface AnalyticsRangeRequest {
  account_id: number;
  metrics: string[];
  date_from: string;
  date_to: string;
  tz?: string;
}

export type ImageOutputFormat = 'jpeg' | 'png' | 'webp' | 'bmp' | 'jpg';
export type ReplaceType = 'transparent' | 'image' | 'color';
export type PrivacyStatus = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';

export const VIDEO_OUTPUT_FORMATS = [
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'mpeg',
  'mpg', '3gp', 'ogv', 'ts', 'vob', 'm4v', 'f4v', 'rm',
  'divx', 'asf',
] as const;
export type VideoOutputFormat = (typeof VIDEO_OUTPUT_FORMATS)[number];

export const VIDEO_TONES = [
  'professional', 'casual', 'humorous', 'inspirational', 'educational',
  'dramatic', 'energetic', 'calm', 'friendly', 'authoritative',
  'storytelling', 'persuasive',
] as const;
export type VideoTone = (typeof VIDEO_TONES)[number];

export const VIDEO_FORMATS = ['youtube-shorts', 'youtube-video', 'instagram-post-video', 'mp4'] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export interface TaskProgressResponse {
  status: string;
  info?: unknown;
}

export interface ScriptToVideoPayload {
  payload: {
    title: string;
    description?: string;
    keywords?: string;
    tone?: VideoTone;
    creativity_level?: number;
    language_code?: string;
    voice_id?: string;
    format?: VideoFormat;
    no_runs?: number;
    logo_id?: string;
    caption_style_id?: string;
  };
  should_export?: boolean;
}

export interface TaskResponse {
  task_id: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string;
  result?: unknown;
  error?: string;
}

export class SimplifiedAPI {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: SimplifiedConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<T> {
    let url = `${this.apiUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Api-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async getAccounts(network?: string) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/get-accounts',
      undefined,
      network ? { network } : undefined
    );
  }

  async createPost(data: CreatePostRequest) {
    return this.request<unknown>('POST', '/api/v1/service/social-media/create', data);
  }

  async getPosts(params: {
    account_ids: string;
    page?: number;
    per_page?: number;
    category?: string;
    tz?: string;
    search?: string;
    query?: string;
  }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/get-posts',
      undefined,
      params as Record<string, string | number | undefined>
    );
  }

  async getDrafts(params: {
    account_ids: string;
    page?: number;
    per_page?: number;
    search?: string;
    tz?: string;
    order_by?: string;
    order?: string;
  }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/get-drafts',
      undefined,
      params as Record<string, string | number | undefined>
    );
  }

  async deletePost(data: { group_id?: string; post_schedule_id?: string }) {
    return this.request<unknown>('POST', '/api/v1/service/social-media/delete-post', data);
  }

  async deleteDraft(data: { group_id?: string; draft_ids?: string[] }) {
    return this.request<unknown>('POST', '/api/v1/service/social-media/delete-draft', data);
  }

  async updatePost(data: {
    post_id: string;
    message?: string;
    date?: string;
    time?: string;
    timezone?: string;
    media?: string[];
  }) {
    return this.request<unknown>('PUT', '/api/v1/service/social-media/update-post', data);
  }

  async updateDraft(data: {
    draft_id: string;
    message?: string;
    date?: string;
    time?: string;
    timezone?: string;
    media?: string[];
  }) {
    return this.request<unknown>('PUT', '/api/v1/service/social-media/update-draft', data);
  }

  async getAnalyticsRange(data: AnalyticsRangeRequest) {
    return this.request<unknown>('POST', '/api/v1/service/social-media/analytics/range', data);
  }

  async getAnalyticsPosts(params: {
    account_id: number;
    date_from: string;
    date_to: string;
    page?: number;
    per_page?: number;
  }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/analytics/posts',
      undefined,
      params as Record<string, number | string | undefined>
    );
  }

  async getAnalyticsAggregated(params: {
    account_id: number;
    date_from: string;
    date_to: string;
  }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/analytics/aggregated',
      undefined,
      params as Record<string, number | string | undefined>
    );
  }

  async getAnalyticsAudience(params: {
    account_id: number;
    date_from: string;
    date_to: string;
    tz?: string;
  }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/analytics/audience',
      undefined,
      params as Record<string, number | string | undefined>
    );
  }

  // ── Tasks ───────────────────────────────────────────────────────────────

  async getTask(taskId: string) {
    return this.request<TaskStatusResponse>('GET', `/api/v1/service/tasks/${taskId}`);
  }

  async getTaskProgress(taskId: string) {
    return this.request<TaskProgressResponse>('GET', `/api/v1/service/tasks/progress/${taskId}`);
  }

  async getExportStatus(exportId: string) {
    return this.request<unknown>('GET', `/api/v1/service/export-lib/${exportId}`);
  }

  // ── Image Tools ─────────────────────────────────────────────────────────

  async blurBackground(params: { image_url: string; blur_value: number }) {
    return this.request<{ image_url: string; error?: string }>(
      'POST',
      '/api/v1/service/image-tools/blur-background',
      params
    );
  }

  async convertImageFormat(params: { image_url: string; output_format?: ImageOutputFormat }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/convert-image-format', params);
  }

  async generativeFill(params: {
    image_url: string;
    prompt: string;
    mask_url?: string;
    mask_base64?: string;
    negative_prompt?: string;
    count?: number;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/generative-fill', params);
  }

  async imageOutpainting(params: {
    image_url: string;
    mask_url: string;
    prompt: string;
    negative_prompt?: string;
    guidance_scale?: number;
    count?: number;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/image-outpainting', params);
  }

  async upscaleImage(params: { image_url: string; scale?: 2 | 4 | 8 }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/upscale-image', params);
  }

  async magicInpaint(params: { image_url: string; prompt: string; scale?: number }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/magic-inpaint', params);
  }

  async pixToPix(params: {
    image_url: string;
    prompt: string;
    image_guidance_scale?: number;
    counts?: number;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/pix-to-pix', params);
  }

  async removeBackground(params: {
    image_url: string;
    magic_crop?: boolean;
    background_color?: string;
    output_format?: 'png' | 'jpeg';
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/remove-background', params);
  }

  async replaceImage(params: {
    image_url: string;
    replace_type: ReplaceType;
    replace_color?: string;
    replace_image?: string;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/replace-image', params);
  }

  async restoreImage(params: { image_url: string; scale?: number }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/restore-image', params);
  }

  async sdScribble(params: {
    prompt: string;
    negative_prompt: string;
    image_url?: string;
    image?: string;
    image_resolution?: number;
    steps?: number;
    guidance_scale?: number;
    counts?: number;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/image-tools/sd-scrible', params);
  }

  // ── Video Tools ────────────────────────────────────────────────────────

  async addBRollsVideo(params: {
    title: string;
    media_url?: string;
    asset?: string;
    language_code?: string;
    should_export?: boolean;
  }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/add-b-rolls-video', params);
  }

  async convertVideoFormat(params: { video_url: string; output_format?: VideoOutputFormat }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/convert-video-format', params);
  }

  async mergeVideos(params: { video_urls: string[] }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/merge-videos', params);
  }

  async removeAudio(params: { video_url: string }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/remove-audio', params);
  }

  async reverseVideo(params: { video_url: string }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/reverse-video', params);
  }

  async scriptToVideo(params: ScriptToVideoPayload) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/script-to-video', params);
  }

  async textToVideo(params: ScriptToVideoPayload) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/text-to-video', params);
  }

  async speedupVideo(params: { video_url: string; playbackrate: number }) {
    return this.request<TaskResponse>('POST', '/api/v1/service/video-tools/speedup-video', params);
  }

  // ── AI Image Generation ──────────────────────────────────────────────────

  async generateAiImage(params: {
    model: string;
    capability: 'prompt' | 'reference_image' | 'multiple_images';
    parameters: {
      prompt: string;
      aspect_ratio?: string;
      count?: number;
      negative_prompt?: string;
      reference_images?: string[];
      seed?: number;
    };
    properties?: string[];
  }) {
    return this.request<{ task_id: string; id: string; art_variation_id: string }>(
      'POST',
      '/api/v1/service/ai-image/generate',
      params
    );
  }

  async getAiImageStatus(artVariationId: string) {
    return this.request<{
      id: string;
      job_status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'RENDERING' | 'DONE' | 'FAILED';
      modified: string;
      images?: { asset_id: string; url: string }[];
      errors?: { detail?: { message: string; code: string } };
    }>('GET', `/api/v1/service/ai-image/status/${artVariationId}`);
  }

  async listAiImageModels(params?: { model_id?: string; capability?: string }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/service/ai-image/models',
      undefined,
      params as Record<string, string | undefined>
    );
  }
}
