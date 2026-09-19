export const IMAGE_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const IMAGE_UPLOAD_FORMAT_LABEL = "JPG / PNG / WebP / GIF";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function imageContentType(file: File): string {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_BY_EXTENSION[ext] ?? "image/jpeg";
}

export function isAllowedImageUploadFile(file: File): boolean {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext in IMAGE_MIME_BY_EXTENSION;
}
