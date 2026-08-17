import { Upload } from "tus-js-client";
import { supabase } from "@/lib/supabase";
export {
  LISTEN_BAR_AUDIO_UPLOAD_ACCEPT,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL,
  isAllowedListenBarAudioFile,
  listenBarAudioContentType,
  listenBarAudioSizeLabel,
} from "./listen-bar-audio-policy";

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
