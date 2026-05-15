import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Service role：`.env.local` 可設 `SUPABASE_SERVICE_KEY` 或 Supabase 預設的 `SUPABASE_SERVICE_ROLE_KEY`。 */

const MIME_ATTEMPTS = ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"] as const;

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

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { audioBase64, fileName, userId } = body as {
    audioBase64?: string;
    fileName?: string;
    userId?: string;
  };

  if (typeof audioBase64 !== "string" || !audioBase64.length) {
    return NextResponse.json({ ok: false, error: "audioBase64 is required" }, { status: 400 });
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    return NextResponse.json({ ok: false, error: "fileName is required" }, { status: 400 });
  }
  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
  }

  const safeName = fileName.trim();
  if (safeName.includes("..") || safeName.includes("/") || safeName.includes("\\")) {
    return NextResponse.json({ ok: false, error: "Invalid fileName" }, { status: 400 });
  }

  const uid = userId.trim();
  if (uid.includes("..") || uid.includes("/") || uid.includes("\\")) {
    return NextResponse.json({ ok: false, error: "Invalid userId" }, { status: 400 });
  }

  const storagePath = `${uid}/hooks/${safeName}`;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(audioBase64, "base64");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid base64" }, { status: 400 });
  }

  if (buffer.length === 0) {
    return NextResponse.json({ ok: false, error: "Empty audio payload" }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lastError: { message: string } | null = null;
  for (const contentType of MIME_ATTEMPTS) {
    const { error } = await admin.storage.from("battle-audio").upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });
    if (!error) {
      return NextResponse.json({ ok: true, path: storagePath });
    }
    lastError = error;
    if (!isLikelyStorageMimeRejection(error)) break;
  }

  return NextResponse.json(
    { ok: false, error: lastError?.message ?? "Upload failed" },
    { status: 400 },
  );
}
