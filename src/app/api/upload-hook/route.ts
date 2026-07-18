import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * JSON body（非 multipart）：{ storagePath, audioBase64, userId }
 * 大檔 WAV 在 Vercel 可能觸發 413：可調高方案限制，或改用客戶端 supabase.storage（見 battle_arena_rls_and_storage.sql 之 anon hooks 政策）。
 */
const MIME_ATTEMPTS = ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"] as const;
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

function bearerToken(req: Request) {
  const value = req.headers.get("authorization") ?? "";
  return value.replace(/^Bearer\s+/i, "").trim() || null;
}

function isLikelyStorageMimeRejection(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes("mime") ||
    (msg.includes("invalid") && msg.includes("type")) ||
    msg.includes("not allowed") ||
    msg.includes("unsupported") ||
    msg.includes("415")
  );
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase server configuration" },
      { status: 500 },
    );
  }

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });

  let body: { storagePath?: string; audioBase64?: string; userId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected application/json" }, { status: 400 });
  }

  const storagePath = body.storagePath;
  const audioBase64 = body.audioBase64;
  const userId = body.userId;

  if (typeof storagePath !== "string" || !storagePath.trim()) {
    return NextResponse.json({ error: "storagePath is required" }, { status: 400 });
  }
  if (typeof audioBase64 !== "string" || !audioBase64.length) {
    return NextResponse.json({ error: "audioBase64 is required" }, { status: 400 });
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const path = storagePath.trim();
  const uid = userId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9/._-]+$/.test(path) || path.includes("..") || !path.startsWith(`${uid}/hooks/`)) {
    return NextResponse.json({ error: "Invalid storagePath" }, { status: 400 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || userData.user?.id !== uid) {
    return NextResponse.json({ error: "Unauthorized upload path" }, { status: 403 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(audioBase64, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid base64" }, { status: 400 });
  }

  if (buffer.length === 0) {
    return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio payload is too large" }, { status: 413 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lastError: { message: string } | null = null;
  for (const contentType of MIME_ATTEMPTS) {
    const { data, error } = await supabase.storage.from("battle-audio").upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (!error && data) {
      return NextResponse.json({ path: data.path });
    }
    lastError = error;
    if (error && !isLikelyStorageMimeRejection(error)) break;
  }

  return NextResponse.json(
    { error: lastError?.message ?? "Upload failed" },
    { status: 500 },
  );
}
