import { Upload } from "tus-js-client";
import { supabase } from "@/lib/supabase";

export const LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES = 104857600;
export const LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL = "100MB";

export const LISTEN_BAR_AUDIO_UPLOAD_ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave,audio/aiff,audio/x-aiff,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp3,.wav,.wave,.aif,.aiff,.m4a,.aac,.ogg";

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/aiff",
  "audio/x-aiff",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
]);

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  wave: "audio/wav",
};

export function isAllowedListenBarAudioFile(file: File): boolean {
  if (ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext in AUDIO_MIME_BY_EXTENSION;
}

export function listenBarAudioContentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionMimeType = AUDIO_MIME_BY_EXTENSION[ext];
  if (extensionMimeType) return extensionMimeType;
  if (ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return file.type;
  return "audio/mpeg";
}

export function listenBarAudioSizeLabel(file: File): string {
  const mb = file.size / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
}

export function isListenBarStorageSizeLimitError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  return message.includes("maximum size exceeded") || message.includes("413");
}

function storageProjectId(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  const projectId = new URL(url).hostname.split(".")[0] ?? "";
  if (!projectId) throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL.");
  return projectId;
}

export function uploadListenBarAudioFile(
  bucketName: string,
  objectPath: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      throw error;
    }
    if (!session?.access_token) {
      throw new Error("請先登入再上傳音檔。");
    }

    const projectId = storageProjectId();
    return new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        metadata: {
          bucketName,
          objectName: objectPath,
          contentType,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        onProgress: (bytesUploaded, bytesTotal) => {
          if (bytesTotal > 0) onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onError: reject,
        onSuccess: () => resolve(),
      });

      upload.start();
    });
  });
}
