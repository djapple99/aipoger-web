import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const BUCKET = "listen-bar-audio";
const LOSSLESS_EXT_RE = /\.(wav|aif|aiff)$/i;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env.production"));

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const bitrateArg = process.argv.find((arg) => arg.startsWith("--bitrate="));
const bitrate = bitrateArg?.split("=")[1]?.trim() || "192k";
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
    });
  });
}

function convertedPath(originalPath) {
  return originalPath.replace(LOSSLESS_EXT_RE, ".mp3");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function objectExists(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (data && !error) return true;
  const text = [error?.message, error?.name, error?.statusCode].filter(Boolean).join(" ");
  if (/not found|404|object not found/i.test(text)) return false;
  return false;
}

async function fetchRows() {
  const { data, error } = await supabase
    .from("listen_bar_tracks")
    .select("id,title,artist,genre,audio_path,duration_seconds,is_active,review_status,source")
    .eq("source", "community")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []).filter((row) => {
    const reviewStatus = String(row.review_status || "").toLowerCase();
    return row.audio_path &&
      LOSSLESS_EXT_RE.test(row.audio_path) &&
      !["hidden", "removed", "rejected"].includes(reviewStatus);
  });
  return Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
}

async function convertOne(row) {
  const sourcePath = row.audio_path.trim();
  const targetPath = convertedPath(sourcePath);
  const tempDir = await mkdtemp(path.join(tmpdir(), "aipoger-listen-bar-"));
  const inputPath = path.join(tempDir, `source${path.extname(sourcePath).toLowerCase() || ".wav"}`);
  const outputPath = path.join(tempDir, "playback.mp3");

  try {
    const targetAlreadyExists = await objectExists(targetPath);
    if (!targetAlreadyExists) {
      const { data: sourceBlob, error: downloadError } = await supabase.storage.from(BUCKET).download(sourcePath);
      if (downloadError || !sourceBlob) throw downloadError || new Error(`Could not download ${sourcePath}`);

      const sourceBuffer = Buffer.from(await sourceBlob.arrayBuffer());
      await writeFile(inputPath, sourceBuffer);
      await run("ffmpeg", [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        inputPath,
        "-vn",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        bitrate,
        outputPath,
      ]);

      const outputBuffer = await readFile(outputPath);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(targetPath, outputBuffer, {
        contentType: "audio/mpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }

    const before = await stat(inputPath).catch(() => null);
    const outputBuffer = existsSync(outputPath) ? await readFile(outputPath) : null;
    const outputSize = outputBuffer ? outputBuffer.length : null;
    const outputSha256 = outputBuffer ? sha256(outputBuffer) : null;

    if (apply) {
      const { error: updateError } = await supabase
        .from("listen_bar_tracks")
        .update({ audio_path: targetPath })
        .eq("id", row.id)
        .eq("audio_path", sourcePath);
      if (updateError) throw updateError;
    }

    return {
      id: row.id,
      title: row.title,
      genre: row.genre,
      from: sourcePath,
      to: targetPath,
      uploaded: !targetAlreadyExists,
      updated: apply,
      originalBytes: before?.size ?? null,
      mp3Bytes: outputSize,
      mp3Sha256: outputSha256,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const rows = await fetchRows();
console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  targetCount: rows.length,
  bitrate,
  tracks: rows.map((row) => ({
    id: row.id,
    title: row.title,
    genre: row.genre,
    from: row.audio_path,
    to: convertedPath(row.audio_path),
  })),
}, null, 2));

if (!apply) {
  process.exit(0);
}

const results = [];
for (const row of rows) {
  console.log(`Converting ${row.title || row.id}`);
  results.push(await convertOne(row));
}

console.log(JSON.stringify({
  mode: "apply",
  converted: results.length,
  results,
}, null, 2));
