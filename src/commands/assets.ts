import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getConfig } from '../config';
import { SimplifiedAPI, ASSET_TYPES, AssetTypeName } from '../api';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/avi',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

const ASSET_TYPE_BY_MIME: Record<string, number> = {
  'image/png': ASSET_TYPES.image,
  'image/jpeg': ASSET_TYPES.image,
  'image/gif': ASSET_TYPES.image,
  'image/webp': ASSET_TYPES.image,
  'image/bmp': ASSET_TYPES.image,
  'image/tiff': ASSET_TYPES.image,
  'video/mp4': ASSET_TYPES.video,
  'video/quicktime': ASSET_TYPES.video,
  'video/avi': ASSET_TYPES.video,
  'video/x-matroska': ASSET_TYPES.video,
  'video/webm': ASSET_TYPES.video,
  'audio/mpeg': ASSET_TYPES.audio,
  'audio/wav': ASSET_TYPES.audio,
  'application/pdf': ASSET_TYPES.pdf,
};

export async function uploadAsset(args: { file: string; name?: string }) {
  const api = new SimplifiedAPI(getConfig());

  const filePath = path.resolve(args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    console.error(`❌ Unsupported file type: ${ext}`);
    process.exit(1);
  }

  const filename = args.name ?? path.basename(filePath);
  const title = path.basename(filename, path.extname(filename));
  const resourceId = randomUUID();
  const assetType = ASSET_TYPE_BY_MIME[mimeType] ?? ASSET_TYPES.image;

  try {
    console.log('⏳ Signing upload...');
    const sign = await api.signAsset({
      filename,
      filetype: mimeType,
      resource: 'assets',
      resource_id: resourceId,
    });

    console.log('⏳ Uploading to storage...');
    const buffer = fs.readFileSync(filePath);
    await api.uploadToS3(sign.signed, buffer, mimeType);

    console.log('⏳ Registering asset...');
    const result = await api.createAsset({
      id: resourceId,
      asset_type: sign.asset_type ?? assetType,
      asset_key: sign.asset_key,
      asset_name: filename,
      asset_url: sign.asset_url,
      thumbnail: sign.asset,
      bucket_name: sign.bucket_name,
      payload: { title },
    });

    console.log('✅ Asset uploaded:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function getAsset(args: { id: string }) {
  const api = new SimplifiedAPI(getConfig());
  try {
    const result = await api.getAsset(args.id);
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

export async function importAsset(args: {
  url: string;
  name?: string;
}) {
  const api = new SimplifiedAPI(getConfig());

  try {
    const result = await api.createAssetFromUrl({
      url: args.url,
      name: args.name,
    });

    console.log('✅ Asset imported:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e: unknown) {
    console.error(`❌ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
