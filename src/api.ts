import { SimplifiedConfig } from './config';

/** Split a comma-separated id list into an array so it is sent as repeated query params. */
function splitIds(input: string): string[] {
  return input.split(',').map((s) => s.trim()).filter(Boolean);
}

export const ASSET_TYPES = {
  image: 0,
  video: 2,
  giphy: 4,
  font: 6,
  audio: 8,
  pdf: 17,
} as const;
export type AssetTypeName = keyof typeof ASSET_TYPES;

export interface AssetSignResponse {
  resource_id: string;
  asset: string;
  asset_url: string;
  signed: string;
  asset_key: string;
  asset_type: number;
  bucket_name: string;
}

export interface CreatePostRequest {
  message: string;
  account_ids: string[];
  action: 'schedule' | 'add_to_queue' | 'draft';
  date?: string;
  media?: string[];
  additional?: Record<string, unknown>;
  /** When true with 2+ account_ids, the API groups the posts under one groupId (one card). */
  group?: boolean;
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

// V2 AI video generation. Capabilities are per-model (the backend validates),
// so this list is for help text only — do NOT use it to hard-restrict input.
export const VIDEO_GEN_CAPABILITIES = [
  'prompt', 'reference_image', 'multiple_images', 'first_last_frame',
] as const;
export type VideoGenCapability = (typeof VIDEO_GEN_CAPABILITIES)[number];

export const VIDEO_STORAGE_MODES = ['default', 'transient', 'asset'] as const;
export type VideoStorageMode = (typeof VIDEO_STORAGE_MODES)[number];

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
  private teamspaceId?: string;

  constructor(config: SimplifiedConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.teamspaceId = config.teamspaceId;
  }

  /**
   * Inject the active teamspace into outgoing requests.
   * The backend resolves the teamspace (a Space) from the `Space` header, value = the
   * numeric Space id. Keep this the ONLY place that knows the mechanism, so it stays a
   * one-edit change. When teamspaceId is undefined the request is unchanged — the token
   * operates in its default workspace (backward compatible).
   */
  private applyTeamspace(headers: Record<string, string>): void {
    if (this.teamspaceId) {
      headers['Space'] = this.teamspaceId;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | string[] | undefined>
  ): Promise<T> {
    let url = `${this.apiUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === undefined) continue;
        // Arrays are sent as repeated params (key=a&key=b), which is what the API expects for
        // multi-value filters like account_ids — NOT a single comma-joined value (key=a,b).
        if (Array.isArray(value)) {
          for (const item of value) params.append(key, String(item));
        } else {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Api-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    this.applyTeamspace(headers);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      // The backend rejects teamspace-scoped requests with 403 (no access) or 400
      // (malformed Space id). Make these actionable rather than opaque API errors.
      if (this.teamspaceId && response.status === 403) {
        throw new Error(
          `No access to teamspace ${this.teamspaceId} with this token (403). ` +
            `Run "simplified auth:whoami" to see accessible teamspaces.`
        );
      }
      if (this.teamspaceId && response.status === 400) {
        throw new Error(`Invalid teamspace id "${this.teamspaceId}" (400): ${text}`);
      }
      throw new Error(`API error ${response.status}: ${text}`);
    }

    // 204 No Content (DELETE) and empty bodies have nothing to parse. Returning the raw
    // json() here would throw on an empty body, so short-circuit to undefined.
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
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
    const { account_ids, ...rest } = params;
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/get-posts',
      undefined,
      { ...rest, account_ids: splitIds(account_ids) }
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
    const { account_ids, ...rest } = params;
    return this.request<unknown>(
      'GET',
      '/api/v1/service/social-media/get-drafts',
      undefined,
      { ...rest, account_ids: splitIds(account_ids) }
    );
  }

  async createReviewBundle(data: { title: string; description?: string; draft_ids?: string[] }) {
    return this.request<unknown>(
      'POST',
      '/api/v1/service/social-media/review-bundle/create',
      data
    );
  }

  async addDraftsToReviewBundle(data: { bundle_id: string; draft_ids: string[] }) {
    return this.request<unknown>(
      'POST',
      '/api/v1/service/social-media/review-bundle/add-drafts',
      data
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

  // ── AI Video Generation (V2) ──────────────────────────────────────────────

  async generateVideoV2(params: {
    model: string;
    capability: string;
    parameters: Record<string, unknown>;
    storage?: VideoStorageMode;
  }) {
    return this.request<{
      task_id: string;
      id: string;
      art_variation_id: string;
      storage?: string;
    }>('POST', '/api/v1/ai-imageart/ai-generate-video-v2', params);
  }

  async getVideoVariation(artId: string, variationId: string) {
    return this.request<{
      id: string;
      job_status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'RENDERING' | 'UPDATED' | 'DONE' | 'FAILED';
      modified?: string;
      output?: { id?: string; file_url?: string; thumbnail_cover_image?: string; thumbnail?: string };
      payload?: { errors?: unknown };
    }>('GET', `/api/v1/ai/video/${artId}/variations/${variationId}`);
  }

  /**
   * Discover generation models and their per-(model, capability) field schema.
   * The endpoint serves both engine types via `type`. With no model_id it lists
   * every engine; with model_id + capability it returns the full field schema
   * (labels, field_type, enum_values, defaults, required flags).
   */
  async getModelFields(params: { type: 'image' | 'video'; model_id?: string; capability?: string }) {
    return this.request<unknown>(
      'GET',
      '/api/v1/ai/image/model-fields',
      undefined,
      params as Record<string, string | undefined>
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

  // ── Assets ──────────────────────────────────────────────────────────────────

  async signAsset(params: {
    filename: string;
    filetype: string;
    resource: string;
    resource_id: string;
  }) {
    return this.request<AssetSignResponse>('POST', '/api/v1/assets/sign', params);
  }

  async uploadToS3(signedUrl: string, buffer: Buffer, contentType: string) {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: buffer,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`S3 upload failed ${response.status}: ${text}`);
    }
  }

  async createAssetFromUrl(params: {
    url: string;
    asset_type?: number;
    name?: string;
  }) {
    return this.request<{ id: string }>('POST', '/api/v1/assets/from-url', params);
  }

  async getAsset(id: string) {
    return this.request<unknown>('GET', `/api/v1/assets/${id}`);
  }

  async createAsset(params: {
    thumbnail: string;
    asset_type: number;
    asset_name?: string;
    asset_key?: string;
    asset_url?: string;
    bucket_name?: string;
    id?: string;
    payload?: { title: string };
  }) {
    return this.request<{ id: string; asset_url?: string; thumbnail?: string }>(
      'POST',
      '/api/v1/assets',
      params
    );
  }

  // ── Brand Kits ────────────────────────────────────────────────────────────

  async listBrandKits(params?: { search?: string }) {
    return this.request<unknown>('GET', '/api/v2/brandkits', undefined, params as Record<string, string | undefined>);
  }

  async createBrandKit(data: { title: string; extra?: { description?: string; social_links?: unknown[] } }) {
    return this.request<unknown>('POST', '/api/v1/brandkit', data);
  }

  async getBrandBook(brandId: string, params?: { elements?: string }) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/brandbook`, undefined, params as Record<string, string | undefined>);
  }

  async buildBrandKit(brandId: string, body: Record<string, unknown>) {
    return this.request<{
      brand_kit_id?: string;
      status?: string;
      version?: number;
      warnings?: string[];
    }>('POST', `/api/v2/brandkits/${brandId}/build`, body);
  }

  async importBrandKitModules(brandId: string, body: Record<string, unknown>) {
    return this.request<unknown>('PATCH', `/api/v1/brandkit/${brandId}/import-modules`, body);
  }

  // ── Context Documents ─────────────────────────────────────────────────────

  async listContextDocuments(brandId: string, params?: { canonical_key?: string; search?: string; ordering?: string }) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/context-documents`, undefined, params as Record<string, string | undefined>);
  }

  async createContextDocument(brandId: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/brandkit/${brandId}/context-documents`, body);
  }

  async updateContextDocument(brandId: string, documentLinkId: string, body: Record<string, unknown>) {
    return this.request<unknown>('PATCH', `/api/v1/brandkit/${brandId}/context-documents/${documentLinkId}`, body);
  }

  async deleteContextDocument(brandId: string, documentLinkId: string) {
    return this.request<unknown>('DELETE', `/api/v1/brandkit/${brandId}/context-documents/${documentLinkId}`);
  }

  async getContextDocument(brandId: string, documentLinkId: string) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/context-documents/${documentLinkId}`);
  }

  async getContextDocumentByType(brandId: string, contextType: string) {
    return this.request<unknown>('GET', `/api/v1/brandkit/${brandId}/context-documents/by-type/${contextType}`);
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(resourcetype: string, params?: { primary_type?: string; ordering?: string; search?: string }) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}`, undefined, params as Record<string, string | undefined>);
  }

  async createProject(resourcetype: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}`, body);
  }

  async getProject(resourcetype: string, id: string) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${id}`);
  }

  async exportProjectItems(resourcetype: string, id: string, body: { partner_id: number; item_ids: string[] }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${id}/export-items`, body);
  }

  // ── Project Items ─────────────────────────────────────────────────────────

  async listProjectItems(resourcetype: string, projectId: string, params?: { primary_type?: string; ordering?: string; search?: string }) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${projectId}/items`, undefined, params as Record<string, string | undefined>);
  }

  async createProjectItem(resourcetype: string, projectId: string, body: Record<string, unknown>) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items`, body);
  }

  async getProjectItem(resourcetype: string, projectId: string, id: string) {
    return this.request<unknown>('GET', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}`);
  }

  async deleteProjectItem(resourcetype: string, projectId: string, id: string) {
    return this.request<unknown>('DELETE', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}`);
  }

  async assignAgentToItem(resourcetype: string, projectId: string, id: string, body: { agent_id: string }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}/assign-agent`, body);
  }

  async reorderProjectItem(resourcetype: string, projectId: string, id: string, body: { position: number }) {
    return this.request<unknown>('POST', `/api/v1/projects/${resourcetype}/${projectId}/items/${id}/reorder`, body);
  }

  // ── Discovery ─────────────────────────────────────────────────────────────

  /**
   * Report what the current token can access: its default workspace (the workspace the
   * Api-Key is bound to) and the teamspaces (Spaces) the token's user is a member of.
   * IDs are integers — `teamspaces[].id` is passed straight into the `Space` header.
   */
  async getWorkspaces() {
    return this.request<{
      default_workspace?: { id: number; name?: string };
      teamspaces?: { id: number; name?: string; slug?: string }[];
    }>('GET', '/api/v1/service/workspaces');
  }

  async getBrandKit(brandId: string, params?: { expand?: string; fields?: string; omit?: string }) {
    return this.request<unknown>('GET', `/api/v2/brandkits/${brandId}`, undefined, params as Record<string, string | undefined>);
  }

  async deleteProject(resourcetype: string, id: string) {
    return this.request<unknown>('DELETE', `/api/v1/projects/${resourcetype}/${id}`);
  }
}
