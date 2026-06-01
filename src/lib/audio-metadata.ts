import { parseMp3Metadata, type ParsedMp3Metadata } from "@/lib/mp3-id3";

export type ParsedAudioMetadata = ParsedMp3Metadata & {
  fallbackTitle: string;
};

export function titleFromAudioFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function fileFromDataUrl(dataUrl: string, fileName: string) {
  const [meta, data] = dataUrl.split(",");
  const mimeType = meta?.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

export async function parseAudioMetadata(file: File): Promise<ParsedAudioMetadata> {
  const fallbackTitle = titleFromAudioFileName(file.name);
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "mp3" || file.type === "audio/mpeg" || file.type === "audio/mp3") {
    const metadata = await parseMp3Metadata(file);
    return { ...metadata, fallbackTitle };
  }
  return { fallbackTitle };
}
