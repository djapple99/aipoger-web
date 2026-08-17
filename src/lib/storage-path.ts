/**
 * Supabase Storage object keys must be URL-safe ASCII.
 * Non-Latin characters (e.g. 愛波哥) cause "Invalid key" errors.
 */
function asciiSlug(raw: string, fallback: string, maxLen = 48): string {
  const s = raw
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, maxLen);
  return s || fallback;
}

export function buildHookStoragePath(
  userId: string,
  fighterName: string,
  songName: string,
): { storagePath: string; fileName: string } {
  const fileName = `${asciiSlug(fighterName, "fighter")}_${asciiSlug(songName, "song")}_${Date.now()}.wav`;
  const storagePath = `${userId}/hooks/${fileName}`;
  return { storagePath, fileName };
}

export function buildFullSongStoragePath(
  userId: string,
  fighterName: string,
  songName: string,
  originalFileName: string,
): { storagePath: string; fileName: string } {
  const extension = originalFileName.match(/\.([a-zA-Z0-9]{2,6})$/)?.[1]?.toLowerCase() || "mp3";
  const fileName = `${asciiSlug(fighterName, "fighter")}_${asciiSlug(songName, "song")}_${Date.now()}.${extension}`;
  const storagePath = `${userId}/full-songs/${fileName}`;
  return { storagePath, fileName };
}

export function isValidStorageObjectKey(path: string): boolean {
  return /^[a-zA-Z0-9/._-]+$/.test(path) && !path.includes("..");
}
