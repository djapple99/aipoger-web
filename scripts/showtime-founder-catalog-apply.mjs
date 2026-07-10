#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const eq = clean.indexOf("=");
    if (eq <= 0) continue;
    const key = clean.slice(0, eq).trim();
    let value = clean.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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

function splitIds(value) {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase environment.");
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  const confirmed = process.argv.includes("--confirm=showtime-founder-catalog-2026-07-10");
  const demoIds = splitIds(argValue("demo-ids"));
  const candidateIds = splitIds(argValue("candidate-ids"));
  if (!confirmed) throw new Error("Missing --confirm=showtime-founder-catalog-2026-07-10");
  if (demoIds.length > 0 && (demoIds.length !== 2 || !demoIds.every(isUuid))) {
    throw new Error("If demo IDs are provided, exactly two confirmed demo UUIDs are required.");
  }
  if (candidateIds.length === 0 || !candidateIds.every(isUuid)) throw new Error("Explicit founder catalog candidate UUIDs are required.");

  const admin = adminClient();
  const now = new Date().toISOString();
  let softDeletedDemoCount = 0;
  if (demoIds.length === 2) {
    const { data: demoRows, error: demoReadError } = await admin
      .from("listen_bar_tracks")
      .select("id,title,artist,created_by,review_status,removed_at")
      .in("id", demoIds);
    if (demoReadError) throw demoReadError;
    if ((demoRows ?? []).length !== 2) throw new Error("Confirmed demo IDs did not resolve to exactly two rows.");

    const { error: demoError } = await admin
      .from("listen_bar_tracks")
      .update({
        is_active: false,
        review_status: "removed",
        removed_at: now,
        moderation_note: "Admin soft-deleted confirmed founder catalog demo track.",
        updated_at: now,
      })
      .in("id", demoIds);
    if (demoError) throw demoError;
    softDeletedDemoCount = demoIds.length;
  }

  const { error: showtimeError } = await admin
    .from("listen_bar_tracks")
    .update({
      ai_music_showtime_certified: true,
      ai_music_showtime_certified_at: now,
      ai_music_showtime_certification_source: "founder_catalog",
      ai_music_showtime_public_removed_at: null,
      ai_music_showtime_public_removed_by: null,
      ai_music_showtime_public_removal_note: null,
      ai_music_challenge_status: "showcase",
      ai_music_showtime_updated_at: now,
      updated_at: now,
    })
    .in("id", candidateIds)
    .eq("source", "community")
    .eq("is_active", true);
  if (showtimeError) throw showtimeError;

  console.log(JSON.stringify({
    ok: true,
    applied_at: now,
    soft_deleted_demo_count: softDeletedDemoCount,
    requested_showtime_candidate_count: candidateIds.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
