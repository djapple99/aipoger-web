export const LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES = 30 * 1024 * 1024;
export const LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL = "30MB";

export const LISTEN_BAR_AUDIO_UPLOAD_ACCEPT =
  "audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,.mp3,.m4a,.aac,.ogg";

const LISTEN_BAR_ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
]);

const LISTEN_BAR_AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
};

function audioExtension(file: Pick<File, "name">): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedListenBarAudioFile(file: File): boolean {
  if (LISTEN_BAR_ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return true;
  return audioExtension(file) in LISTEN_BAR_AUDIO_MIME_BY_EXTENSION;
}

export function listenBarAudioContentType(file: File): string {
  const extensionMimeType = LISTEN_BAR_AUDIO_MIME_BY_EXTENSION[audioExtension(file)];
  if (extensionMimeType) return extensionMimeType;
  if (LISTEN_BAR_ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return file.type;
  return "audio/mpeg";
}

export function listenBarAudioSizeLabel(file: File): string {
  const mb = file.size / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
}
