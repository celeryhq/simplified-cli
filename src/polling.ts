import { SimplifiedAPI } from './api';

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 120_000;
export const VIDEO_POLL_TIMEOUT_MS = 300_000;

export async function pollTask(
  api: SimplifiedAPI,
  taskId: string,
  timeoutMs: number = POLL_TIMEOUT_MS
): Promise<unknown> {
  const start = Date.now();
  process.stderr.write(`⏳ Task ${taskId} — waiting for completion`);

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    process.stderr.write('.');

    const status = await api.getTask(taskId);

    if (status.status === 'completed' || status.status === 'success' || status.result) {
      process.stderr.write(' ✅\n');
      return status.result ?? status;
    }

    if (status.status === 'failed' || status.error) {
      process.stderr.write(' ❌\n');
      throw new Error(`Task failed: ${status.error ?? status.status}`);
    }
  }

  process.stderr.write(' ⌛ timed out\n');
  throw new Error(`Task timed out after ${timeoutMs / 1000}s`);
}

export async function pollTaskWithProgress(
  api: SimplifiedAPI,
  taskId: string,
  timeoutMs: number = VIDEO_POLL_TIMEOUT_MS
): Promise<unknown> {
  const start = Date.now();
  process.stderr.write(`⏳ Task ${taskId} — waiting for completion\n`);

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const progress = await api.getTaskProgress(taskId);

    if (progress.info) {
      process.stderr.write(`\r⏳ Progress: ${JSON.stringify(progress.info)}  `);
    }

    if (progress.status === 'completed' || progress.status === 'success') {
      process.stderr.write('\n✅ Task completed\n');
      const status = await api.getTask(taskId);
      return status.result ?? status;
    }

    if (progress.status === 'failed') {
      process.stderr.write('\n❌ Task failed\n');
      throw new Error(`Task failed`);
    }
  }

  process.stderr.write('\n⌛ timed out\n');
  throw new Error(`Task timed out after ${timeoutMs / 1000}s`);
}

export async function submitAndMaybeWait(
  api: SimplifiedAPI,
  action: () => Promise<{ task_id: string }>,
  wait: boolean,
  cmdPrefix: string = 'image',
  timeoutMs: number = POLL_TIMEOUT_MS
) {
  const result = await action();
  if (!wait) {
    console.log(JSON.stringify(result, null, 2));
    console.error(`\n💡 To check status: simplified ${cmdPrefix}:task --id ${result.task_id}`);
    return;
  }
  const final = await pollTask(api, result.task_id, timeoutMs);
  console.log(JSON.stringify(final, null, 2));
}

export const AI_IMAGE_POLL_INTERVAL_MS = 3000;
export const AI_IMAGE_POLL_TIMEOUT_MS = 180_000;

export async function pollAiImageStatus(
  api: SimplifiedAPI,
  artVariationId: string,
  timeoutMs: number = AI_IMAGE_POLL_TIMEOUT_MS
): Promise<{ asset_id: string; url: string }[]> {
  const start = Date.now();
  process.stderr.write(`⏳ Generating image — waiting for completion`);

  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, AI_IMAGE_POLL_INTERVAL_MS));
    process.stderr.write('.');

    const status = await api.getAiImageStatus(artVariationId);

    if (status.job_status === 'DONE') {
      process.stderr.write(' ✅\n');
      return status.images ?? [];
    }

    if (status.job_status === 'FAILED') {
      process.stderr.write(' ❌\n');
      const msg = status.errors?.detail?.message ?? 'Unknown error';
      const code = status.errors?.detail?.code ?? '';
      throw new Error(`Generation failed${code ? ` [${code}]` : ''}: ${msg}`);
    }
  }

  process.stderr.write(' ⌛ timed out\n');
  throw new Error(`Generation timed out after ${timeoutMs / 1000}s`);
}

export async function submitAndMaybeWaitWithExport(
  api: SimplifiedAPI,
  action: () => Promise<{ task_id: string }>,
  wait: boolean,
  cmdPrefix: string = 'video'
) {
  const result = await action();
  if (!wait) {
    console.log(JSON.stringify(result, null, 2));
    console.error(`\n💡 To check status: simplified ${cmdPrefix}:task --id ${result.task_id}`);
    return;
  }

  const taskResult = await pollTaskWithProgress(api, result.task_id, VIDEO_POLL_TIMEOUT_MS);
  const taskObj = taskResult as Record<string, unknown>;

  if (taskObj && typeof taskObj === 'object' && 'export_id' in taskObj) {
    const exportId = taskObj.export_id as string;
    process.stderr.write(`⏳ Export ${exportId} — waiting for export to complete`);

    const exportStart = Date.now();
    while (Date.now() - exportStart < VIDEO_POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      process.stderr.write('.');

      const exportStatus = await api.getExportStatus(exportId);
      const status = exportStatus as Record<string, unknown>;

      if (status.status === 'completed' || status.status === 'success' || status.url) {
        process.stderr.write(' ✅\n');
        console.log(JSON.stringify(exportStatus, null, 2));
        return;
      }

      if (status.status === 'failed') {
        process.stderr.write(' ❌\n');
        throw new Error('Export failed');
      }
    }

    process.stderr.write(' ⌛ timed out\n');
    throw new Error('Export timed out');
  }

  console.log(JSON.stringify(taskResult, null, 2));
}
