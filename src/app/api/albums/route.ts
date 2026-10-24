import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { readPublicAlbums } from "@/lib/server-albums";
import { albumTrackIds } from "@/lib/album";
import { isCurrentMusicGenre } from "@/lib/music-genres";
import { isPublicDiscoveryTrack } from "@/lib/listen-bar-airplay";
import { saveCreatorSubmission, type CreatorSubmissionDb } from "@/lib/creator-submission";
import { cleanListenBarDisplayText, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS } from "@/lib/listen-bar-field-limits";

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? undefined;
  if (id && !uuid(id)) return reply({ error: "INVALID_ALBUM" }, 400);
  try { return reply({ albums: await readPublicAlbums(id) }); }
  catch { return reply({ error: "ALBUMS_UNAVAILABLE" }, 503); }
}
export async function POST(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return reply({ error: "AUTH_REQUIRED" }, 401);
    const body = await request.json().catch(() => null);
    const ids = albumTrackIds(body?.trackIds);
    if (!ids || !uuid(body?.requestId) || body?.confirmedRights !== true || !isCurrentMusicGenre(body?.genre)
      || typeof body?.title !== "string" || !body.title.trim() || body.title.length > 160
      || typeof body?.description !== "string" || body.description.length > 2000) return reply({ error: "INVALID_ALBUM" }, 400);
    const artist = cleanListenBarDisplayText(body.artist, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS);
    if (!artist) return reply({ error: "TITLE_ARTIST_REQUIRED" }, 400);
    const prior = await auth.admin.from("listen_bar_tracks").select("id,work_kind").eq("id", body.requestId).eq("created_by", auth.user.id).maybeSingle();
    if (prior.error) throw prior.error;
    if (prior.data) return prior.data.work_kind === "album" ? reply({ albumId: prior.data.id, replayed: true }) : reply({ error: "INVALID_ALBUM" }, 409);
    const result = await auth.admin.from("listen_bar_tracks").select("id,created_by,work_kind,is_active,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at,audio_path,external_url,cover_path")
      .in("id", ids).eq("created_by", auth.user.id);
    if (result.error) throw result.error;
    if (result.data?.length !== ids.length || result.data.some(row => row.work_kind === "album" || !isPublicDiscoveryTrack(row))) return reply({ error: "ALBUM_TRACKS_NOT_OWNED_OR_UNAVAILABLE" }, 403);
    const coverPath = typeof body.coverPath === "string" ? body.coverPath : "";
    if (coverPath && (!coverPath.startsWith(`${auth.user.id}/`) || coverPath.includes(".."))) return reply({ error: "INVALID_COVER" }, 400);
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${auth.token}` } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const saved = await saveCreatorSubmission(db as unknown as CreatorSubmissionDb, { id: body.requestId, created_by: auth.user.id,
      work_kind: "album", album_track_ids: ids, credit_submission_confirmed: body.confirmedCredit === true,
      title: body.title.trim(), artist, genre: body.genre, description: body.description.trim() || null,
      cover_path: coverPath || result.data.find(row => row.id === ids[0])?.cover_path || null, audio_path: null,
      source: "community", is_featured_official: false, is_active: true, review_status: "approved", bar_phase: "public", ai_music_challenge_status: "showcase" });
    if (saved.error || !saved.data) return reply({ error: saved.error?.message ?? "ALBUM_SAVE_UNCONFIRMED" }, /CREDIT_/.test(saved.error?.message ?? "") ? 429 : 503);
    return reply({ albumId: saved.data.id }, 201);
  } catch { return reply({ error: "ALBUM_SAVE_FAILED" }, 503); }
}
