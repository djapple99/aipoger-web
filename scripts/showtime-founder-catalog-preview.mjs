#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const VALID_GENRES = new Set([
  "K-Pop 韓式動感",
  "Rap 街頭說唱",
  "Disco / Funk / City-Pop",
  "R&B 深情瞬間",
  "Band Rock 熱血搖滾",
  "EDM 百大電音",
  "Jazz / Bossa 微醺時刻",
  "Spiritual / Ambient 放鬆宇宙",
  "Chinese Fusion 新派古風",
  "台語熊high",
  "Original 自我風格",
]);
const RETIRE_LOSS_LIMIT = 8;
const OFFICIAL_AUDIENCE_MIN = 3;
const DEMO_MARKER_RE = /\b(demo|mock|sample|test|qa-|sandbox)\b|測試|示範|樣本/i;

function parseEnvFile(path) {
  if (!existsSync(path)) return;
  const source = readFileSync(path, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const eq = clean.indexOf("=");
    if (eq <= 0) continue;
    const key = clean.slice(0, eq).trim();
    let value = clean.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

parseEnvFile(resolve(process.cwd(), ".env.local"));
parseEnvFile(resolve(process.cwd(), ".env.production"));

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase environment.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function publicTime(row) {
  return row.promoted_at || row.created_at || null;
}

function statusOf(row) {
  return cleanText(row.review_status).toLowerCase();
}

function playable(row) {
  return row.is_active !== false && Boolean(cleanText(row.audio_path));
}

function isModerationHeld(row) {
  const status = statusOf(row);
  return status === "moderation_hold" || status === "moderation hold";
}

function currentSurface(row) {
  if (row.ai_music_showtime_certified && !row.ai_music_showtime_public_removed_at) return "showtime";
  if (row.removed_at || statusOf(row) === "removed") return "removed";
  if (row.hidden_at || statusOf(row) === "hidden") return "hidden";
  if (isModerationHeld(row)) return "moderation_hold";
  if (row.source === "community" && row.bar_phase === "public") return "bar_public/explore";
  if (row.source === "community" && row.bar_phase === "challenger") return "bar_challenger/explore";
  if (row.source === "community") return "community/explore";
  return cleanText(row.source) || "unknown";
}

function demoMarkerReason(row) {
  const haystack = [
    row.title,
    row.artist,
    row.ai_tool,
    row.genre,
    row.mood,
    row.description,
    row.moderation_note,
    row.audio_path,
    row.cover_path,
  ].map(cleanText).join(" ");
  return DEMO_MARKER_RE.test(haystack) ? "explicit demo/test marker in metadata/path" : "";
}

function candidateBaseExclusions(row, cutoffMs) {
  const exclusions = [];
  const surfacedAt = publicTime(row);
  const surfacedMs = new Date(surfacedAt ?? "").getTime();
  if (row.source !== "community") exclusions.push("not_community_upload");
  if (row.is_featured_official) exclusions.push("official_featured");
  if (row.ai_music_showtime_certified) exclusions.push("already_showtime");
  if (row.ai_music_showtime_public_removed_at) exclusions.push("showtime_public_removed");
  if (!surfacedAt || !Number.isFinite(surfacedMs)) exclusions.push("missing_public_time");
  else if (surfacedMs > cutoffMs) exclusions.push("public_less_than_30_days");
  if (!playable(row)) exclusions.push("not_playable");
  if (row.hidden_at || statusOf(row) === "hidden") exclusions.push("hidden");
  if (row.removed_at || statusOf(row) === "removed") exclusions.push("removed");
  if (statusOf(row) === "rejected") exclusions.push("rejected");
  if (isModerationHeld(row)) exclusions.push("moderation_hold");
  if (!VALID_GENRES.has(cleanText(row.genre))) exclusions.push("invalid_genre");
  if (!cleanText(row.created_by)) exclusions.push("missing_creator_account");
  return exclusions;
}

function archiveAudienceCount(row) {
  const payload = row.result_payload && typeof row.result_payload === "object" ? row.result_payload : {};
  const number = Number(payload.audienceCount ?? payload.audience_count ?? row.total_votes ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

async function readOfficialLosses(admin, trackIds) {
  const lossesByTrack = new Map(trackIds.map((id) => [id, 0]));
  if (trackIds.length === 0) return lossesByTrack;
  const { data: invites, error: inviteError } = await admin
    .from("ai_music_challenge_invites")
    .select("defender_track_id,battle_id,challenger_user_id,defender_user_id,status")
    .in("defender_track_id", trackIds)
    .eq("status", "accepted")
    .not("battle_id", "is", null);
  if (inviteError) {
    if (/schema cache|does not exist|PGRST204|42P01/i.test(inviteError.message)) return lossesByTrack;
    throw inviteError;
  }
  const rows = (invites ?? []).filter((row) => row.defender_track_id && row.battle_id && row.challenger_user_id && row.defender_user_id && row.challenger_user_id !== row.defender_user_id);
  const battleIds = [...new Set(rows.map((row) => row.battle_id))];
  if (battleIds.length === 0) return lossesByTrack;
  const [{ data: battles, error: battleError }, { data: archives, error: archiveError }] = await Promise.all([
    admin.from("battles").select("id,battle_type,winner").in("id", battleIds),
    admin.from("battle_result_archives").select("battle_id,winner,total_votes,result_payload").in("battle_id", battleIds),
  ]);
  if (battleError || archiveError) {
    const error = battleError ?? archiveError;
    if (/schema cache|does not exist|PGRST204|42P01/i.test(error.message)) return lossesByTrack;
    throw error;
  }
  const battleById = new Map((battles ?? []).filter((row) => row.battle_type === "ai_music_challenge").map((row) => [row.id, row]));
  const inviteByBattleId = new Map(rows.map((row) => [row.battle_id, row]));
  for (const archive of archives ?? []) {
    const battle = battleById.get(archive.battle_id);
    const invite = inviteByBattleId.get(archive.battle_id);
    if (!battle || !invite) continue;
    if (archiveAudienceCount(archive) < OFFICIAL_AUDIENCE_MIN) continue;
    const winner = archive.winner || battle.winner;
    if (winner === "fighter_b") lossesByTrack.set(invite.defender_track_id, (lossesByTrack.get(invite.defender_track_id) ?? 0) + 1);
  }
  return lossesByTrack;
}

function reportRow(row, extra = {}) {
  return {
    id: row.id,
    title: row.title,
    creator: row.artist,
    creator_user_id: row.created_by,
    genre: row.genre,
    public_time: publicTime(row),
    current_surface: currentSurface(row),
    playable: playable(row),
    review_status: row.review_status ?? "approved",
    heart_count: row.heart_count ?? row.positive_reaction_count ?? 0,
    ...extra,
  };
}

async function main() {
  const writePath = argValue("write");
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const admin = adminClient();
  const legacySelect = "id,title,artist,ai_tool,genre,mood,description,audio_path,cover_path,created_by,source,bar_phase,is_active,review_status,moderation_note,hidden_at,removed_at,is_featured_official,positive_reaction_count,heart_count,created_at,promoted_at";
  const select = `${legacySelect},ai_music_showtime_certified,ai_music_showtime_certified_at,ai_music_showtime_certification_source,ai_music_showtime_public_removed_at`;
  let read = await admin
    .from("listen_bar_tracks")
    .select(select)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (read.error && /schema cache|column.*does not exist|PGRST204|ai_music_showtime/i.test(`${read.error.message} ${read.error.code ?? ""}`)) {
    read = await admin
      .from("listen_bar_tracks")
      .select(legacySelect)
      .order("created_at", { ascending: true })
      .limit(2000);
  }
  const { data, error } = read;
  if (error) throw error;

  const rows = data ?? [];
  const lossesByTrack = await readOfficialLosses(admin, rows.map((row) => row.id));
  const demoCandidates = rows
    .map((row) => ({ row, marker: demoMarkerReason(row) }))
    .filter((item) => item.marker)
    .map((item) => reportRow(item.row, { demo_marker: item.marker }));

  const candidates = [];
  const exclusions = [];
  for (const row of rows) {
    const baseExclusions = candidateBaseExclusions(row, cutoff.getTime());
    const officialLosses = lossesByTrack.get(row.id) ?? 0;
    if (officialLosses >= RETIRE_LOSS_LIMIT) baseExclusions.push("explore_retired_8_losses");
    const demoMarker = demoMarkerReason(row);
    if (demoMarker) baseExclusions.push("demo_candidate_needs_owner_confirmation");
    if (baseExclusions.length === 0) {
      candidates.push(reportRow(row, { official_losses: officialLosses }));
    } else {
      exclusions.push(reportRow(row, { official_losses: officialLosses, exclusion_reasons: baseExclusions }));
    }
  }

  const report = {
    generated_at: now.toISOString(),
    cutoff_public_before: cutoff.toISOString(),
    write_safe: false,
    demo_confirmation: {
      status: demoCandidates.length === 2 ? "exactly_two_candidates_but_owner_must_confirm_ids_before_apply" : "ambiguous_or_not_exactly_two_do_not_apply",
      count: demoCandidates.length,
      candidates: demoCandidates,
    },
    founder_catalog: {
      candidate_count: candidates.length,
      exclusion_count: exclusions.length,
      candidates,
      exclusions,
    },
    apply_guard: "Do not run apply without explicit owner confirmation of demo IDs and founder catalog candidate IDs.",
  };

  const output = JSON.stringify(report, null, 2);
  if (writePath) {
    const fullPath = resolve(process.cwd(), writePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, `${output}\n`);
    console.log(`Wrote read-only preview report to ${fullPath}`);
  }
  console.log(output);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
