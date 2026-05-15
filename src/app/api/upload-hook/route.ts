import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const storagePath = form.get("storagePath");
  const audioBase64 = form.get("audioBase64");
  const userId = form.get("userId");

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
  if (path.includes("..") || !path.startsWith(`${uid}/hooks/`)) {
    return NextResponse.json({ error: "Invalid storagePath" }, { status: 400 });
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

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.storage
    .from("battle-audio")
    .upload(path, buffer, { contentType: "audio/wav", upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path: data.path });
}
