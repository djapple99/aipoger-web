import { audioAssetId, audioAssetUrl } from "./audio-asset-ref";
import { readOwnedAudio, verifiedAudioResult } from "./server-audio-uploads";
import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveLinkPreview } from "@/lib/server-external-music";
import { creatorAdmin } from "@/lib/server-creator-auth";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { publicWorkIdFromLink, type BattleLinkPlayback } from "@/lib/battle-link-rules";
import { resolveQCrashSunoMediaSource } from "@/lib/q-crash-suno-media";

export type BattleLinkPreview = { audioUrl?: string; title: string; creator: string; cover: string; duration: number; sourceType: "suno" | "youtube" | "work" | "upload"; sourceUrl: string; workId: string | null; playback: BattleLinkPlayback; token: string };
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";
export function signBattlePreview(value: Omit<BattleLinkPreview, "token">, userId: string) {
  if (!secret()) throw new Error("Missing signing key");
  const data = Buffer.from(JSON.stringify({ ...value, userId, expires: Date.now() + 30 * 60_000 })).toString("base64url");
  return `${data}.${createHmac("sha256", secret()).update(`battle-link:${data}`).digest("base64url")}`;
}
export function verifyBattlePreview(token: unknown, userId: string): BattleLinkPreview | null {
  if (typeof token !== "string" || token.length > 16000) return null;
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra) return null;
  const expected = createHmac("sha256", secret()).update(`battle-link:${data}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try { const p = JSON.parse(Buffer.from(data, "base64url").toString()); return p.userId === userId && p.expires > Date.now() ? p : null; } catch { return null; }
}
async function sourceDuration(url: string, type: "youtube" | "suno") {
  const response = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.body) throw new Error("SOURCE_UNAVAILABLE");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 5_000_000) throw new Error("SOURCE_TOO_LARGE"); chunks.push(r.value); } } finally { await reader.cancel(); }
  const html = Buffer.concat(chunks).toString("utf8").replaceAll('\\"', '"');
  const match = type === "youtube" ? html.match(/"lengthSeconds"\s*:\s*"?(\d+(?:\.\d+)?)/)
    : html.match(/"duration(?:_seconds)?"\s*:\s*"?(\d+(?:\.\d+)?)/);
  const precise = type === "youtube" ? Number(html.match(/"approxDurationMs"\s*:\s*"?(\d+)/)?.[1]) / 1000 : NaN;
  const rounded = Number(match?.[1]);
  const duration = Number.isFinite(precise) && precise > 0 && Math.abs(precise - rounded) < 2 ? precise : rounded;
  if ((!Number.isFinite(duration) || duration <= 0) && type === "youtube") return 0;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("SOURCE_DURATION_UNAVAILABLE");
  return duration;
}
export async function resolveBattleLink(raw: unknown, userId: string): Promise<BattleLinkPreview> {
  const uploadedId = audioAssetId(raw);
  if (uploadedId) {
    const admin = creatorAdmin(), asset = await readOwnedAudio(admin, uploadedId, userId), media = await verifiedAudioResult(admin,asset);
    const value: Omit<BattleLinkPreview,"token"> = { audioUrl:media.audioUrl,title:"",creator:"",cover:"",duration:Number(asset.duration_seconds),sourceType:"upload",sourceUrl:audioAssetUrl(asset.id),workId:null,playback:{type:"upload",url:audioAssetUrl(asset.id),start:0,seconds:Number(asset.duration_seconds)} };
    return {...value,token:signBattlePreview(value,userId)};
  }
  const workId = publicWorkIdFromLink(raw);
  let resolved: Omit<BattleLinkPreview, "token">;
  if (workId) {
    const admin = creatorAdmin();
    const { data: row, error } = await admin.from("listen_bar_tracks").select("created_by,duration_seconds,audio_path").eq("id", workId).maybeSingle();
    if (error || row?.created_by !== userId) throw new Error("OWN_WORK_REQUIRED");
    const detail = await readPublicWorkDetail(workId);
    if (!detail || detail.work.workKind === "album") throw new Error("PUBLIC_SINGLE_REQUIRED");
    const external = detail.externalMedia ?? (detail.work.videoId ? { url: `https://www.youtube.com/watch?v=${detail.work.videoId}` } : null);
    if (external) {
      const p = await resolveBattleLink(external.url, userId);
      resolved = { ...p, sourceType: "work", sourceUrl: `https://aipoger.com/works/${workId}`, workId, title: detail.work.title, creator: detail.work.artist, cover: detail.work.coverUrl };
    } else {
      const uploaded = audioAssetId(row.audio_path);
      if (uploaded) {
        const p = await resolveBattleLink(row.audio_path,userId);
        resolved = {...p,title:detail.work.title,creator:detail.work.artist,cover:detail.work.coverUrl,sourceType:"work",sourceUrl:`https://aipoger.com/works/${workId}`,workId};
      } else {
        const duration = Number(row.duration_seconds);
        if (!(duration > 0) || !row.audio_path || /^https?:/i.test(row.audio_path)) throw new Error("SOURCE_DURATION_UNAVAILABLE");
        const url = admin.storage.from("listen-bar-audio").getPublicUrl(row.audio_path).data.publicUrl;
        resolved = { audioUrl:url,title:detail.work.title,creator:detail.work.artist,cover:detail.work.coverUrl,duration,sourceType:"work",sourceUrl:`https://aipoger.com/works/${workId}`,workId,playback:{type:"upload",url,start:0,seconds:duration} };
      }
    }
  } else {
    const p = await resolveLinkPreview(raw, userId);
    if (p.media.provider === "spotify") throw new Error("BATTLE_LINK_UNSUPPORTED");
    const type = p.media.provider;
    if (type === "suno" && !(await resolveQCrashSunoMediaSource(p.media.url))) throw new Error("SOURCE_UNAVAILABLE");
    const duration = await sourceDuration(p.media.url, type);
    resolved = { title: p.title, creator: p.artist, cover: p.coverUrl, duration, sourceType: type, sourceUrl: p.media.url, workId: null, playback: { type, url: p.media.url, start: 0, seconds: duration } };
  }
  return { ...resolved, token: signBattlePreview(resolved, userId) };
}
