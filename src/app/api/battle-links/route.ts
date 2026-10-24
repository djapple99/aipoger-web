import { NextResponse } from "next/server";
import { creatorAuth, creatorAdmin } from "@/lib/server-creator-auth";
import { resolveBattleLink, verifyBattlePreview } from "@/lib/server-battle-links";
import { battleClip, dropPlaybackMode } from "@/lib/battle-link-rules";
import { isCurrentMusicGenre } from "@/lib/music-genres";
import { isDropChallengeAcceptable, buildDropBattleSchedulePayloadFromPreset, validateDropBattleScheduledStart, buildDropBattleSchedulePayload } from "@/lib/battle-pool-client";
export const preferredRegion = "hnd1";
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const json = (v: unknown, status = 200) => NextResponse.json(v, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
  const battleId = new URL(request.url).searchParams.get("battle");
  if (battleId !== null) {
    if (!uuid(battleId)) return json({ error: "INVALID_BATTLE" }, 400);
    const admin = creatorAdmin();
    const [archive, result] = await Promise.all([
      admin.from("battle_result_archives").select("winner,total_votes,result_payload").eq("battle_id", battleId).maybeSingle(),
      admin.from("battles").select("status,playback_a,playback_b").eq("id", battleId).maybeSingle(),
    ]);
    if (archive.error || result.error) return json({ error: "MEDIA_UNAVAILABLE" }, 503);
    const count = Number(archive.data?.result_payload?.audienceCount ?? archive.data?.total_votes ?? 0);
    if (!result.data || !archive.data || count < 3 || !["finished", "completed", "q_crash_finished"].includes(result.data?.status || "")) return json({ error: "NOT_PUBLIC" }, 404);
    const resolve = async (p: { type: string; url: string; start: number; seconds: number } | null) => {
      if (!p || p.type !== "upload") return p;
      const signed = await admin.storage.from("battle-audio").createSignedUrl(p.url, 3600);
      return signed.error || !signed.data?.signedUrl ? null : { ...p, url: signed.data.signedUrl };
    };
    const [A, B] = await Promise.all([resolve(result.data.playback_a), resolve(result.data.playback_b)]);
    return json({ A, B, winner: archive.data.winner });
  }
  const id = new URL(request.url).searchParams.get("target");
  if (!uuid(id)) return json({ error: "INVALID_TARGET" }, 400);
  const { data, error } = await creatorAdmin().from("battle_queue").select("id,genre,title,original_file_name,drop_playback_mode,submission_mode,status,expires_at,scheduled_start_at,cancellation_evaluation_at,match_group_id").eq("id", id).maybeSingle();
  if (error) return json({ error: "TARGET_UNAVAILABLE" }, 503);
  if (!data || data.submission_mode === "q_crash" || data.match_group_id || !isDropChallengeAcceptable(data)) return json({ error: "TARGET_CLOSED" }, 409);
  return json({ target: { id: data.id, title: data.title || data.original_file_name, genre: data.genre, mode: data.drop_playback_mode || "legacy45", scheduledStartAt: data.scheduled_start_at } });
}
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return json({ error: "AUTH_REQUIRED" }, 401);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "INVALID_REQUEST" }, 400);
    if (body.action === "preview") return json({ preview: await resolveBattleLink(body.url, auth.user.id) });
    if (body.action !== "submit" || !uuid(body.requestId) || !["drop", "q_crash"].includes(body.battleMode)) return json({ error: "INVALID_REQUEST" }, 400);
    const prior = await auth.admin.from("battle_queue").select("id,user_id").eq("id", body.requestId).maybeSingle();
    if (prior.error) throw prior.error;
    if (prior.data) return prior.data.user_id === auth.user.id ? json({ queueId: prior.data.id, replayed: true }) : json({ error: "REQUEST_CONFLICT" }, 409);
    const p = verifyBattlePreview(body.previewToken, auth.user.id);
    if (!p) return json({ error: "PREVIEW_EXPIRED" }, 400);
    // Re-read current ownership, public eligibility and external source before persisting.
    const fresh = await resolveBattleLink(p.sourceUrl, auth.user.id);
    if (fresh.sourceUrl !== p.sourceUrl || fresh.playback.type !== p.playback.type) return json({ error: "SOURCE_CHANGED" }, 409);
    if (body.confirmedRights !== true || !isCurrentMusicGenre(body.genre)) return json({ error: "RIGHTS_AND_GENRE_REQUIRED" }, 400);
    const name = typeof body.creator === "string" ? body.creator.trim().slice(0, 80) : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    if (!name || !title) return json({ error: "TITLE_CREATOR_REQUIRED" }, 400);
    let mode = dropPlaybackMode(body.playbackMode);
    let targetId: string | null = null;
    let schedule = null;
    if (body.battleMode === "drop") {
      if (body.targetId !== undefined && body.targetId !== null && !uuid(body.targetId)) return json({ error: "INVALID_TARGET" }, 400);
      targetId = body.targetId || null;
      if (targetId) {
        const target = await auth.admin.from("battle_queue").select("id,genre,drop_playback_mode,submission_mode,status,expires_at,scheduled_start_at,cancellation_evaluation_at,match_group_id").eq("id", targetId).maybeSingle();
        if (target.error) throw target.error;
        if (!target.data || target.data.submission_mode === "q_crash" || target.data.match_group_id || !isDropChallengeAcceptable(target.data)) return json({ error: "TARGET_CLOSED" }, 409);
        mode = target.data.drop_playback_mode || "legacy45";
        if (body.genre !== target.data.genre) return json({ error: "TARGET_GENRE_MISMATCH" }, 409);
        schedule = target.data.scheduled_start_at ? buildDropBattleSchedulePayload(target.data.scheduled_start_at) : null;
      } else {
        if (!mode || mode === "legacy45") return json({ error: "INVALID_PLAYBACK_MODE" }, 400);
        if (body.startPreset !== undefined) schedule = buildDropBattleSchedulePayloadFromPreset([10, 15, 20].includes(body.startPreset) ? body.startPreset : null);
        else if (body.startAt) {
          if (validateDropBattleScheduledStart(body.startAt)) return json({ error: "INVALID_START_TIME" }, 400);
          schedule = buildDropBattleSchedulePayload(body.startAt);
        }
      }
    } else mode = "full";
    const clip = mode && battleClip(mode, fresh.duration, body.clipStart);
    if (!clip) return json({ error: "CLIP_OUT_OF_RANGE" }, 400);
    const profile = await auth.admin.from("fighter_profiles").select("song_cover_url").eq("id", auth.user.id).maybeSingle();
    let cover = fresh.cover || profile.data?.song_cover_url || "";
    if (body.coverPath) {
      if (typeof body.coverPath !== "string" || !body.coverPath.startsWith(`${auth.user.id}/q-crash-covers/`) || !/^[a-zA-Z0-9/._-]+$/.test(body.coverPath) || body.coverPath.includes("..")) return json({ error: "INVALID_COVER" }, 400);
      const signed = await auth.admin.storage.from("battle-audio").createSignedUrl(body.coverPath, 365 * 86400);
      if (signed.error || !signed.data?.signedUrl) return json({ error: "INVALID_COVER" }, 400);
      cover = signed.data.signedUrl;
    }
    const { data, error } = await auth.admin.rpc("create_battle_link_entry", { p_actor: auth.user.id, p_id: body.requestId, p_entry: {
      mode: body.battleMode, joinCardId: body.battleMode === "q_crash" && uuid(body.joinCardId) ? body.joinCardId : null, dropMode: body.battleMode === "drop" ? mode : null, targetId, title, creator: name,
      genre: body.genre, aiTool: typeof body.aiTool === "string" ? body.aiTool.trim().slice(0, 80) : "AI Music",
      lyrics: typeof body.lyrics === "string" ? body.lyrics.trim().slice(0, 8000) : null,
      sourceType: fresh.sourceType, sourceUrl: fresh.sourceUrl, workId: fresh.workId, cover,
      duration: fresh.duration, playback: { ...fresh.playback, ...clip }, scheduledStartAt: schedule?.scheduled_start_at ?? null,
      cancellationEvaluationAt: schedule?.cancellation_evaluation_at ?? null,
    } });
    if (error) return json({ error: /ACTIVE_BATTLE|TARGET_|MODE_|ROLE_/.test(error.message) ? error.message : "ENTRY_UNAVAILABLE" }, 409);
    return json({ queueId: data }, 201);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "SOURCE_UNAVAILABLE" }, 400); }
}
