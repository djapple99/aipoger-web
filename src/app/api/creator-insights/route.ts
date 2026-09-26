import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { insightRate, summarizeCreatorTrack, type CreatorBattleInsight, type InsightEvent, type InsightFavorite, type InsightHeart, type InsightTrack } from "@/lib/creator-insights";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
type Row = Record<string, unknown>;
type Query = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> };
async function allRows<T>(query: () => Query): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < 50_000; offset += 500) {
    const result = await query().range(offset, offset + 499);
    if (result.error) throw new Error("Source unavailable");
    rows.push(...(result.data ?? []) as T[]);
    if ((result.data?.length ?? 0) < 500) return rows;
  }
  throw new Error("Source limit exceeded");
}
const chunks = <T,>(values: T[]) => Array.from({ length: Math.ceil(values.length / 50) }, (_, index) => values.slice(index * 50, index * 50 + 50));

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("Configuration unavailable");
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
    // Ownership comes exclusively from the verified token, never a query parameter.
    const owner = data.user.id;
    const to = new Date().toISOString();
    const from = new Date(Date.parse(to) - 28 * 86_400_000).toISOString();
    const [tracks, battlesA, battlesB] = await Promise.all([
      allRows<InsightTrack>(() => admin.from("listen_bar_tracks").select("id,title,artist,created_by").eq("created_by", owner).eq("is_active", true).order("id")),
      allRows<Row>(() => admin.from("battles").select("id,status,fighter_a_user_id,fighter_b_user_id,song_a_name,song_b_name").eq("fighter_a_user_id", owner).order("id")),
      allRows<Row>(() => admin.from("battles").select("id,status,fighter_a_user_id,fighter_b_user_id,song_a_name,song_b_name").eq("fighter_b_user_id", owner).order("id")),
    ]);
    const events: InsightEvent[] = [], hearts: InsightHeart[] = [];
    for (const ids of chunks(tracks.map(track => track.id))) {
      const [plays, reactions] = await Promise.all([
        allRows<InsightEvent>(() => admin.from("analytics_events").select("id,song_id,user_id,created_at,metadata").in("song_id", ids).gte("created_at", from).lt("created_at", to).order("id")),
        allRows<InsightHeart>(() => admin.from("listen_bar_track_reactions").select("track_id,user_id,created_at").in("track_id", ids).eq("reaction", "heart").order("track_id").order("user_id").order("vote_date")),
      ]);
      events.push(...plays); hearts.push(...reactions);
    }
    let favorites: InsightFavorite[] = [];
    if (tracks.length) {
      const { data: blob, error: storageError } = await admin.storage.from("listen-bar-data").download("honor-board/interactions.json");
      if (storageError && !/not found|not exist|404/i.test(storageError.message)) throw new Error("Favorites unavailable");
      if (blob) {
        const stored = JSON.parse(await blob.text());
        if (!Array.isArray(stored?.records)) throw new Error("Invalid favorites");
        favorites = stored.records.filter((record: InsightFavorite) => record && Array.isArray(record.favoriteUserIds) && typeof record.targetId === "string");
      }
    }
    const ownedBattles = new Map([...battlesA, ...battlesB].map(battle => [String(battle.id), battle]));
    const battles: CreatorBattleInsight[] = [];
    for (const ids of chunks([...ownedBattles.keys()])) {
      const archives = await allRows<Row>(() => admin.from("battle_result_archives").select("battle_id,final_vote_left,final_vote_right,result_payload,archived_at").in("battle_id", ids).gte("archived_at", from).lt("archived_at", to).order("battle_id"));
      for (const archive of archives) {
        const battle = ownedBattles.get(String(archive.battle_id));
        const payload = archive.result_payload as Row | null;
        if (!battle || !["finished", "q_crash_finished"].includes(String(battle.status)) || !["drop_battle", "q_crash"].includes(String(payload?.source)) || Number(payload?.audienceCount) < 3 || !Number.isFinite(Number(payload?.audienceCount))) continue;
        const left = Number(archive.final_vote_left), right = Number(archive.final_vote_right);
        if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0 || left + right < 3) continue;
        const sideA = battle.fighter_a_user_id === owner;
        battles.push({ id: String(battle.id), title: String((sideA ? battle.song_a_name : battle.song_b_name) || "—"),
          opponent: String((sideA ? battle.song_b_name : battle.song_a_name) || "—"), mode: String(payload?.source),
          archivedAt: String(archive.archived_at), votes: insightRate(sideA ? left : right, left + right) });
      }
    }
    return NextResponse.json({ from, to, tracks: tracks.map(track => summarizeCreatorTrack(track, events, hearts, favorites, from, to)), battles: battles.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)) }, { headers });
  } catch {
    // Never expose service errors or replace a failed source with fabricated zeros.
    return NextResponse.json({ error: "Insights temporarily unavailable" }, { status: 503, headers });
  }
}
