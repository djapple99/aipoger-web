import { choicePublicPath } from "@/lib/aipoger-choice";
import type { Lang } from "@/lib/locale";

// Stable per cover: repeated shares reuse the preview, replacing a cover gets a
// new URL instead of reusing a chat service's old text-only preview.
export function choiceCoverVersion(coverUrl: string) {
  let hash = 2166136261;
  for (const character of coverUrl) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `cover3-${(hash >>> 0).toString(36)}`;
}

export function choiceSharePath(id: string, kind: "official" | "creator", lang: Lang, coverUrl: string) {
  return `${choicePublicPath(id, kind)}&lang=${lang}&share=${choiceCoverVersion(coverUrl)}`;
}

export function choiceShareImagePath(id: string, coverUrl: string) {
  return `/choice/${encodeURIComponent(id)}/share-image?v=${choiceCoverVersion(coverUrl)}`;
}
