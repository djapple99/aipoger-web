export const AUDIO_UPLOAD_MAX_BYTES_100MB = 104857600;
export const AUDIO_UPLOAD_MAX_LABEL_100MB = "100MB";

export const STANDARD_AUDIO_UPLOAD_ACCEPT =
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

export function isAllowedStandardAudioFile(file: File): boolean {
  if (ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext in AUDIO_MIME_BY_EXTENSION;
}

export function standardAudioContentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionMimeType = AUDIO_MIME_BY_EXTENSION[ext];
  if (extensionMimeType) return extensionMimeType;
  if (ALLOWED_AUDIO_MIME_TYPES.has(file.type)) return file.type;
  return "audio/mpeg";
}

export function audioSizeLabel(file: File): string {
  const mb = file.size / 1024 / 1024;
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)}MB`;
}
