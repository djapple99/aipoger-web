import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SOURCE_DIR = process.argv[2] ?? "/Users/huangyihong/aipoger-web/public songs 2026may22";
const AUDIO_BUCKET = "listen-bar-audio";
const COVER_BUCKET = "listen-bar-covers";
const AUDIO_PREFIX = "official/2026may22";
const COVER_PREFIX = "official-covers/2026may22";

function loadEnv() {
  const envText = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of envText.split(/\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 0) continue;
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function syncSafeToInt(bytes, offset) {
  return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
}

function uint32ToInt(bytes, offset) {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function decodeTextFrame(bytes) {
  if (bytes.length <= 1) return "";
  const encoding = bytes[0];
  const payload = bytes.slice(1);
  try {
    if (encoding === 1) return new TextDecoder("utf-16").decode(payload).replace(/\0/g, "").trim();
    if (encoding === 2) return new TextDecoder("utf-16be").decode(payload).replace(/\0/g, "").trim();
    if (encoding === 3) return new TextDecoder("utf-8").decode(payload).replace(/\0/g, "").trim();
    return new TextDecoder("iso-8859-1").decode(payload).replace(/\0/g, "").trim();
  } catch {
    return new TextDecoder("utf-8").decode(payload).replace(/\0/g, "").trim();
  }
}

function findTerminator(bytes, start, encoding) {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i;
    }
    return -1;
  }
  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === 0) return i;
  }
  return -1;
}

function parseCover(bytes) {
  if (bytes.length < 8) return null;
  const encoding = bytes[0];
  let cursor = 1;
  const mimeEnd = findTerminator(bytes, cursor, 0);
  if (mimeEnd < 0) return null;
  const mimeType = new TextDecoder("iso-8859-1").decode(bytes.slice(cursor, mimeEnd)).trim() || "image/jpeg";
  cursor = mimeEnd + 1;
  cursor += 1;
  const descriptionEnd = findTerminator(bytes, cursor, encoding);
  if (descriptionEnd < 0) return null;
  cursor = descriptionEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
  const imageBytes = bytes.slice(cursor);
  if (imageBytes.length === 0) return null;
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  return { bytes: Buffer.from(imageBytes), mimeType, ext };
}

function parseMp3Metadata(filePath) {
  const file = readFileSync(filePath);
  if (file[0] !== 0x49 || file[1] !== 0x44 || file[2] !== 0x33) return {};
  const majorVersion = file[3];
  const tagSize = syncSafeToInt(file, 6);
  if (!tagSize || tagSize > 8 * 1024 * 1024) return {};
  const bytes = file.subarray(0, tagSize + 10);
  const result = {};
  let cursor = 10;
  while (cursor + 10 <= bytes.length) {
    const frameId = new TextDecoder("iso-8859-1").decode(bytes.subarray(cursor, cursor + 4));
    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
    const frameSize = majorVersion === 4 ? syncSafeToInt(bytes, cursor + 4) : uint32ToInt(bytes, cursor + 4);
    cursor += 10;
    if (!frameSize || cursor + frameSize > bytes.length) break;
    const frame = bytes.subarray(cursor, cursor + frameSize);
    const value = frameId.startsWith("T") ? decodeTextFrame(frame) : "";
    if (frameId === "TIT2" && value) result.title = value;
    if (frameId === "TPE1" && value) result.artist = value;
    if (frameId === "TALB" && value) result.album = value;
    if (frameId === "TCON" && value) result.genre = value;
    if (frameId === "TBPM" && value) {
      const bpm = Number.parseInt(value, 10);
      if (Number.isFinite(bpm) && bpm > 0) result.bpm = bpm;
    }
    if (frameId === "APIC" && !result.cover) result.cover = parseCover(frame) ?? undefined;
    cursor += frameSize;
  }
  return result;
}

function durationSeconds(filePath) {
  try {
    const output = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath], {
      encoding: "utf8",
    }).trim();
    const duration = Math.round(Number(output));
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}

function metadataFromFfprobe(filePath) {
  try {
    const output = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format_tags=title,artist,album,genre,bpm", "-of", "json", filePath],
      { encoding: "utf8" },
    );
    const tags = JSON.parse(output)?.format?.tags ?? {};
    const normalizedTags = Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [key.toLowerCase(), typeof value === "string" ? value.trim() : value]),
    );
    const bpm = Number.parseInt(String(normalizedTags.bpm ?? ""), 10);
    return {
      title: typeof normalizedTags.title === "string" ? normalizedTags.title : undefined,
      artist: typeof normalizedTags.artist === "string" ? normalizedTags.artist : undefined,
      album: typeof normalizedTags.album === "string" ? normalizedTags.album : undefined,
      genre: typeof normalizedTags.genre === "string" ? normalizedTags.genre : undefined,
      bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : undefined,
    };
  } catch {
    return {};
  }
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48) || "aipoger-track";
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".wav") return "audio/wav";
  if (ext === ".aif" || ext === ".aiff") return "audio/aiff";
  if (ext === ".m4a") return "audio/mp4";
  return "audio/mpeg";
}

async function listPaths(supabase, bucket, prefix) {
  const paths = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) paths.push(`${prefix}/${item.name}`);
    if (data.length < 1000) break;
    offset += data.length;
  }
  return paths;
}

async function removePrefix(supabase, bucket, prefix) {
  const paths = await listPaths(supabase, bucket, prefix);
  if (paths.length === 0) return 0;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
  return paths.length;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const files = readdirSync(SOURCE_DIR)
  .filter((name) => /\.(mp3|wav|aif|aiff|m4a|aac)$/i.test(name))
  .map((name) => join(SOURCE_DIR, name));

if (files.length === 0) {
  throw new Error(`No audio files found in ${SOURCE_DIR}`);
}

console.log(`Reloading ${files.length} official 傷心酒吧 Bar Heartbreak tracks from ${SOURCE_DIR}`);

await removePrefix(supabase, AUDIO_BUCKET, AUDIO_PREFIX);
await removePrefix(supabase, COVER_BUCKET, COVER_PREFIX);

const { error: deleteOfficialError } = await supabase
  .from("listen_bar_tracks")
  .delete()
  .or("source.eq.official,is_featured_official.eq.true");
if (deleteOfficialError) throw deleteOfficialError;

const rows = [];
for (const [index, filePath] of files.entries()) {
  const fileName = basename(filePath);
  const embeddedMetadata = fileName.toLowerCase().endsWith(".mp3") ? parseMp3Metadata(filePath) : {};
  const metadata = { ...embeddedMetadata, ...metadataFromFfprobe(filePath), cover: embeddedMetadata.cover };
  const hash = createHash("sha1").update(readFileSync(filePath)).digest("hex").slice(0, 10);
  const audioPath = `${AUDIO_PREFIX}/${String(index + 1).padStart(2, "0")}-${slug(metadata.title || fileName.replace(/\.[^.]+$/, ""))}-${hash}${extname(fileName).toLowerCase()}`;

  const { error: audioError } = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, readFileSync(filePath), {
    contentType: contentType(filePath),
    upsert: true,
  });
  if (audioError) throw audioError;

  let coverPath = null;
  if (metadata.cover) {
    coverPath = `${COVER_PREFIX}/${String(index + 1).padStart(2, "0")}-${slug(metadata.title || fileName)}-${hash}.${metadata.cover.ext}`;
    const { error: coverError } = await supabase.storage.from(COVER_BUCKET).upload(coverPath, metadata.cover.bytes, {
      contentType: metadata.cover.mimeType,
      upsert: true,
    });
    if (coverError) throw coverError;
  }

  rows.push({
    title: (metadata.title || fileName.replace(/\.[^.]+$/, "")).trim(),
    artist: (metadata.artist || "愛波哥").trim(),
    ai_tool: "Suno",
    genre: (metadata.genre || "AI Music").trim(),
    mood: (metadata.album || "魷魚螺肉蒜").trim(),
    bpm: metadata.bpm ?? null,
    duration_seconds: durationSeconds(filePath),
    audio_path: audioPath,
    cover_path: coverPath,
    sort_order: (index + 1) * 10,
    is_active: true,
    source: "official",
    is_featured_official: true,
    review_status: "approved",
  });
}

const { error: insertError } = await supabase.from("listen_bar_tracks").insert(rows);
if (insertError) throw insertError;

console.log(`Inserted ${rows.length} official tracks.`);
console.log(rows.map((row, index) => `${index + 1}. ${row.title} / ${row.artist} / ${row.mood}${row.cover_path ? " / cover" : ""}`).join("\n"));
