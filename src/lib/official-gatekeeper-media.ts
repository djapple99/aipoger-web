import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfficialGatekeeperDrop } from "@/lib/official-gatekeeper-drops";

export function isPublicMediaUrl(value: string | null | undefined) {
  return Boolean(value && /^(https?:|data:|\/)/i.test(value));
}

export async function signedBattleAudioUrl(admin: SupabaseClient, path: string | null | undefined, expiresIn = 60 * 60) {
  const text = path?.trim();
  if (!text) return null;
  if (isPublicMediaUrl(text)) return text;
  const { data } = await admin.storage.from("battle-audio").createSignedUrl(text, expiresIn);
  return data?.signedUrl ?? null;
}

export async function attachOfficialGatekeeperMediaUrls(
  admin: SupabaseClient,
  drop: OfficialGatekeeperDrop,
  expiresIn = 60 * 60,
) {
  const [audioUrl, coverUrl] = await Promise.all([
    signedBattleAudioUrl(admin, drop.audioPath, expiresIn),
    signedBattleAudioUrl(admin, drop.coverPath, expiresIn),
  ]);
  return { ...drop, audioUrl, coverUrl };
}
