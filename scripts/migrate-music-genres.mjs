#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const GENRE_MIGRATIONS = [
  ["K-pop動感風", "K-Pop 韓式動感"],
  ["K-pop 動感風", "K-Pop 韓式動感"],
  ["K-Pop動感風", "K-Pop 韓式動感"],
  ["說唱街頭風", "Rap 街頭說唱"],
  ["復古City-Pop", "Disco / Funk / City-Pop"],
  ["復古 City-Pop", "Disco / Funk / City-Pop"],
  ["City Pop / Disco / Funk 城市律動", "Disco / Funk / City-Pop"],
  ["感人抒情", "R&B 深情瞬間"],
  ["熱血搖滾", "Band Rock 熱血搖滾"],
  ["動感電音", "EDM 百大電音"],
  ["心靈 Ambient 宇宙", "Spiritual / Ambient 放鬆宇宙"],
  ["台語熊 High", "Original 自我風格"],
  ["自我風格", "Original 自我風格"],
  ["Custom Style", "Original 自我風格"],
  ["AI Music", "Original 自我風格"],
  ["Pop", "Original 自我風格"],
  [
    "Electronic;Pop;Non-Music;Brit Pop;Disco;Downtempo;Eurodance;House;Trip Hop;Chillout;Easy Listening;Pop Rock;Soft Rock;Spoken Word;Singer-Songwriter",
    "EDM 百大電音",
  ],
];

const TARGETS = [
  { table: "listen_bar_tracks", column: "genre" },
  { table: "battle_queue", column: "genre" },
  { table: "battles", column: "genre" },
  { table: "battle_song_stats", column: "genre" },
  { table: "daily_battle_entries", column: "genre" },
  { table: "official_gatekeeper_drops", column: "genre" },
];

function hasArg(name) {
  return process.argv.includes(name);
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

function envValue(env, key) {
  return process.env[key] ?? env[key];
}

async function countMatches(supabase, target, from) {
  const { count, error } = await supabase
    .from(target.table)
    .select("id", { count: "exact", head: true })
    .eq(target.column, from);

  if (error) throw error;
  return count ?? 0;
}

async function updateMatches(supabase, target, from, to) {
  const { error } = await supabase
    .from(target.table)
    .update({ [target.column]: to })
    .eq(target.column, from);

  if (error) throw error;
}

const apply = hasArg("--apply");
const envPathArgIndex = process.argv.findIndex((arg) => arg === "--env");
const envPath = envPathArgIndex >= 0 ? process.argv[envPathArgIndex + 1] : ".env.local";
const env = loadEnvFile(resolve(process.cwd(), envPath));
const supabaseUrl = envValue(env, "NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = envValue(env, "SUPABASE_SERVICE_ROLE_KEY") ?? envValue(env, "SUPABASE_SERVICE_KEY");

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(apply ? "Applying AIPOGER music genre migration." : "Dry run: AIPOGER music genre migration.");
console.log(apply ? "Real database rows may be updated." : "No database rows will be changed. Re-run with --apply to update.");

let totalMatches = 0;
let totalUpdated = 0;
const missingTargets = [];

for (const target of TARGETS) {
  console.log(`\n${target.table}.${target.column}`);
  for (const [from, to] of GENRE_MIGRATIONS) {
    let matches = 0;
    try {
      matches = await countMatches(supabase, target, from);
    } catch (error) {
      const message = String(error?.message ?? error);
      missingTargets.push(`${target.table}.${target.column}: ${message}`);
      console.log(`  skipped: ${message}`);
      break;
    }

    if (matches === 0) continue;
    totalMatches += matches;
    console.log(`  ${from} -> ${to}: ${matches}`);

    if (apply) {
      await updateMatches(supabase, target, from, to);
      totalUpdated += matches;
    }
  }
}

console.log(`\nMatched rows: ${totalMatches}`);
console.log(`Updated rows: ${totalUpdated}`);

if (missingTargets.length) {
  console.log("\nSkipped targets:");
  for (const item of missingTargets) console.log(`- ${item}`);
}

if (!apply) {
  console.log("\nDry run complete. Apply with: npm run migrate:music-genres -- --apply");
}
