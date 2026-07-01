#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const genreMap = new Map([
  ["K-pop動感風", "K-Pop 韓式動感"],
  ["K-pop韓式動感風", "K-Pop 韓式動感"],
  ["K-pop 韓式動感風", "K-Pop 韓式動感"],
  ["K-pop韓式動感", "K-Pop 韓式動感"],
  ["說唱街頭風", "Rap 街頭說唱"],
  ["復古City-Pop", "Disco / Funk / City-Pop"],
  ["復古disco funk City-Pop", "Disco / Funk / City-Pop"],
  ["感人抒情", "R&B 深情瞬間"],
  ["R&b 深情感人瞬間", "R&B 深情瞬間"],
  ["熱血搖滾", "Band Rock 熱血搖滾"],
  ["樂團華麗熱血搖滾", "Band Rock 熱血搖滾"],
  ["動感電音", "EDM 百大電音"],
  ["歐美百大dj動感電音", "EDM 百大電音"],
  ["爵士Bossa 微醺時刻", "Jazz / Bossa 微醺時刻"],
  ["心靈宗教放鬆宇宙", "Spiritual / Ambient 放鬆宇宙"],
  ["中式古風新派", "Chinese Fusion 新派古風"],
  ["自我風格", "Original 自我風格"],
  ["自我獨有風格", "Original 自我風格"],
  ["Custom Style", "Original Style"],
]);

const structuredTables = [
  { table: "listen_bar_tracks", column: "genre" },
  { table: "daily_battle_entries", column: "genre" },
  { table: "battle_queue", column: "genre" },
  { table: "battles", column: "genre" },
  { table: "official_gatekeeper_drops", column: "genre" },
];

const textTables = [
  { table: "listen_bar_daily_spotlights", columns: ["title", "intro", "short_caption"] },
  { table: "social_posts", columns: ["title", "body", "cta"] },
  { table: "social_post_targets", columns: ["title", "content_text", "background_audio_label", "notes"] },
];

function normalizeText(value) {
  if (typeof value !== "string" || !value) return value;
  let next = value;
  for (const [oldValue, newValue] of genreMap.entries()) {
    next = next.split(oldValue).join(newValue);
  }
  return next;
}

async function updateStructuredTable({ table, column }) {
  const summary = { table, scanned: 0, changed: 0 };
  for (const [oldValue, newValue] of genreMap.entries()) {
    if (oldValue === newValue) continue;
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .eq(column, oldValue);
    if (error) {
      console.warn(`[skip] ${table}.${column}: ${error.message}`);
      return summary;
    }
    const rows = data ?? [];
    summary.scanned += rows.length;
    if (!rows.length) continue;
    summary.changed += rows.length;
    if (!shouldApply) continue;
    const { error: updateError } = await supabase
      .from(table)
      .update({ [column]: newValue })
      .eq(column, oldValue);
    if (updateError) throw new Error(`${table}.${column}: ${updateError.message}`);
  }
  return summary;
}

async function updateTextTable({ table, columns }) {
  const summary = { table, scanned: 0, changed: 0 };
  const { data, error } = await supabase
    .from(table)
    .select(["id", ...columns].join(", "));
  if (error) {
    console.warn(`[skip] ${table}: ${error.message}`);
    return summary;
  }

  for (const row of data ?? []) {
    summary.scanned += 1;
    const patch = {};
    for (const column of columns) {
      const current = row[column];
      const next = normalizeText(current);
      if (typeof current === "string" && next !== current) patch[column] = next;
    }
    if (Object.keys(patch).length === 0) continue;
    summary.changed += 1;
    if (!shouldApply) continue;
    const { error: updateError } = await supabase
      .from(table)
      .update(patch)
      .eq("id", row.id);
    if (updateError) throw new Error(`${table}: ${updateError.message}`);
  }
  return summary;
}

const structured = [];
for (const target of structuredTables) structured.push(await updateStructuredTable(target));

const text = [];
for (const target of textTables) text.push(await updateTextTable(target));

console.log(JSON.stringify({
  mode: shouldApply ? "apply" : "dry-run",
  structured,
  text,
}, null, 2));
