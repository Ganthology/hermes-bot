import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { HermesGatewayClient } from '../gateway/client';
import { fileAttach, imageAttachBytes, pdfAttach } from '../gateway/methods';
import { createId } from '../utils/text';

/** Mirror gateway `image.attach_bytes` ~25 MB cap. */
export const IMAGE_ATTACH_MAX_BYTES = 25 * 1024 * 1024;
/** Mirror gateway `pdf.attach` ~50 MB cap. */
export const PDF_ATTACH_MAX_BYTES = 50 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']);

export type AttachmentKind = 'image' | 'pdf' | 'file';

export type StagedAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  /** Local content URI for preview / re-read — never sent as an RPC path. */
  localUri: string;
  mimeType: string;
  /** Preview for image chips (data URL or local URI). */
  previewUri?: string;
  /** Raw base64 when already in memory (image picker). */
  contentBase64?: string;
  byteLength?: number;
  /** Set after successful `file.attach`. */
  refText?: string;
};

export type PickerDenial = {
  kind: 'permission' | 'cancel' | 'error';
  message: string;
};

function extensionOf(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

function basename(uri: string, fallback: string): string {
  const cleaned = uri.split('?')[0] ?? uri;
  const segment = cleaned.split('/').filter(Boolean).pop();
  return segment && segment.length > 0 ? decodeURIComponent(segment) : fallback;
}

export function classifyAttachment(name: string, mimeType?: string): AttachmentKind {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = extensionOf(name);
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  return 'file';
}

export function mimeForFilename(name: string, fallback = 'application/octet-stream'): string {
  const ext = extensionOf(name);
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return fallback;
  }
}

async function readLocalBase64(uri: string): Promise<string> {
  const file = new File(uri);
  return file.base64();
}

function assertSize(kind: AttachmentKind, bytes: number | undefined, label: string): void {
  if (bytes == null) {
    return;
  }
  if (kind === 'image' && bytes > IMAGE_ATTACH_MAX_BYTES) {
    throw new Error(`${label} is too large (max 25 MB for images)`);
  }
  if (kind === 'pdf' && bytes > PDF_ATTACH_MAX_BYTES) {
    throw new Error(`${label} is too large (max 50 MB for PDFs)`);
  }
}

function stagedFromImageAsset(asset: ImagePicker.ImagePickerAsset): StagedAttachment {
  const name = asset.fileName?.trim() || basename(asset.uri, `photo_${Date.now()}.jpg`);
  const mimeType = asset.mimeType ?? mimeForFilename(name, 'image/jpeg');
  const kind = classifyAttachment(name, mimeType);
  assertSize(kind, asset.fileSize, name);
  const previewUri = asset.base64
    ? `data:${mimeType};base64,${asset.base64}`
    : asset.uri;
  return {
    id: createId('att'),
    kind: kind === 'image' ? 'image' : kind,
    name,
    localUri: asset.uri,
    mimeType,
    previewUri,
    contentBase64: asset.base64 ?? undefined,
    byteLength: asset.fileSize,
  };
}

/**
 * Camera → single photo. Returns [] on cancel; throws human denial on permission.
 */
export async function pickFromCamera(): Promise<StagedAttachment[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw Object.assign(new Error('Camera access was denied. Enable it in Settings to take photos.'), {
      denial: 'permission' as const,
    });
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    base64: true,
    exif: false,
  });
  if (result.canceled || !result.assets?.length) {
    return [];
  }
  return result.assets.map(stagedFromImageAsset);
}

/**
 * Gallery → one or more images. Returns [] on cancel.
 */
export async function pickFromLibrary(): Promise<StagedAttachment[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw Object.assign(
      new Error('Photo library access was denied. Enable it in Settings to attach images.'),
      { denial: 'permission' as const },
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.85,
    base64: true,
    exif: false,
    selectionLimit: 10,
  });
  if (result.canceled || !result.assets?.length) {
    return [];
  }
  return result.assets.map(stagedFromImageAsset);
}

/**
 * Document picker — PDFs and common docs. Returns [] on cancel.
 */
export async function pickDocuments(): Promise<StagedAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'text/*',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/rtf',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.map((asset) => {
    const name = asset.name?.trim() || basename(asset.uri, `file_${Date.now()}`);
    const mimeType = asset.mimeType ?? mimeForFilename(name);
    const kind = classifyAttachment(name, mimeType);
    assertSize(kind, asset.size, name);
    return {
      id: createId('att'),
      kind,
      name,
      localUri: asset.uri,
      mimeType,
      byteLength: asset.size,
      previewUri: kind === 'image' ? asset.uri : undefined,
    };
  });
}

async function ensureBase64(attachment: StagedAttachment): Promise<string> {
  if (attachment.contentBase64) {
    return attachment.contentBase64;
  }
  const base64 = await readLocalBase64(attachment.localUri);
  if (!base64) {
    throw new Error(`Could not read ${attachment.name}`);
  }
  return base64;
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
}

/**
 * Upload one staged attachment on the remote byte path. Returns the attachment
 * with `refText` set for files. Throws on failure — caller must not submit.
 */
export async function uploadStagedAttachment(
  client: HermesGatewayClient,
  sessionId: string,
  attachment: StagedAttachment,
): Promise<StagedAttachment> {
  const base64 = await ensureBase64(attachment);
  const estimatedBytes = attachment.byteLength ?? Math.floor((base64.length * 3) / 4);
  assertSize(attachment.kind, estimatedBytes, attachment.name);

  switch (attachment.kind) {
    case 'image': {
      const result = await imageAttachBytes(client, {
        session_id: sessionId,
        content_base64: base64,
        filename: attachment.name,
      });
      if (!result.attached) {
        throw new Error(result.message || `Could not attach ${attachment.name}`);
      }
      return attachment;
    }
    case 'pdf': {
      const result = await pdfAttach(client, {
        session_id: sessionId,
        content_base64: base64,
        filename: attachment.name,
      });
      if (!result.attached) {
        throw new Error(result.message || `Could not attach ${attachment.name}`);
      }
      return attachment;
    }
    case 'file': {
      const result = await fileAttach(client, {
        session_id: sessionId,
        name: attachment.name,
        data_url: toDataUrl(attachment.mimeType, base64),
      });
      if (!result.attached || !result.ref_text) {
        throw new Error(result.message || `Could not attach ${attachment.name}`);
      }
      return { ...attachment, refText: result.ref_text };
    }
    default: {
      const _exhaustive: never = attachment.kind;
      return _exhaustive;
    }
  }
}

/**
 * Attach every staged item, then build prompt text the way Desktop does:
 * file `ref_text` lines + optional caption; vision-only fallback caption.
 */
export async function syncAttachmentsForSubmit(
  client: HermesGatewayClient,
  sessionId: string,
  attachments: StagedAttachment[],
): Promise<{ attachments: StagedAttachment[]; promptText: (caption: string) => string }> {
  const synced: StagedAttachment[] = [];
  for (const item of attachments) {
    synced.push(await uploadStagedAttachment(client, sessionId, item));
  }

  const promptText = (caption: string): string => {
    const refs = synced
      .map((item) => item.refText)
      .filter((ref): ref is string => Boolean(ref))
      .join('\n');
    const visible = caption.trim();
    const hasVision = synced.some((item) => item.kind === 'image' || item.kind === 'pdf');
    return (
      [refs, visible].filter(Boolean).join('\n\n') ||
      (hasVision ? 'What do you see in this image?' : '')
    );
  };

  return { attachments: synced, promptText };
}

export function displayLabelForAttachment(attachment: StagedAttachment): string {
  switch (attachment.kind) {
    case 'image':
      return attachment.name;
    case 'pdf':
      return `PDF: ${attachment.name}`;
    case 'file':
      return attachment.name;
    default: {
      const _exhaustive: never = attachment.kind;
      return _exhaustive;
    }
  }
}

/** User-bubble summary when sending attachments (+ optional caption). */
export function formatUserMessageContent(
  caption: string,
  attachments: StagedAttachment[],
): string {
  const labels = attachments.map(displayLabelForAttachment);
  const visible = caption.trim();
  if (labels.length === 0) {
    return visible;
  }
  const tray = labels.map((label) => `📎 ${label}`).join('\n');
  return visible ? `${tray}\n\n${visible}` : tray;
}

const IMAGE_PATH_EXT = /\.(?:png|jpe?g|gif|webp|bmp)$/i;

/**
 * Pull gateway-local image paths / MEDIA tags / markdown images from history text
 * for inbound display via GET /api/media.
 */
export function extractInboundImagePaths(content: string): string[] {
  const found: string[] = [];
  const push = (raw: string) => {
    const path = raw.trim().replace(/^<|>$/g, '');
    if (!path || found.includes(path)) {
      return;
    }
    if (/^(?:https?:|data:)/i.test(path) || IMAGE_PATH_EXT.test(path) || path.startsWith('/')) {
      found.push(path);
    }
  };

  const mediaRe = /MEDIA:(?:"([^"]+)"|'([^']+)'|([^\s)]+))/g;
  let match: RegExpExecArray | null;
  while ((match = mediaRe.exec(content)) !== null) {
    push(match[1] || match[2] || match[3] || '');
  }

  const mdRe = /!\[[^\]]*]\(([^)\s]+)\)/g;
  while ((match = mdRe.exec(content)) !== null) {
    push(match[1] || '');
  }

  return found.filter((path) => {
    if (/^(?:https?:|data:)/i.test(path)) {
      return true;
    }
    return IMAGE_PATH_EXT.test(path);
  });
}

/** Strip MEDIA directives from visible bubble text when we render them as images. */
export function stripMediaDirectives(content: string): string {
  return content
    .replace(/^[ \t]*MEDIA:(?:"[^"]+"|'[^']+'|\S+)[ \t]*$/gm, '')
    .replace(/[ \t]*MEDIA:(?:"[^"]+"|'[^']+'|\S+)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
