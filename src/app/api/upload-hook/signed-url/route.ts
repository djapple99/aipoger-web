import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isValidStorageObjectKey(path: string): boolean {
  return /^[a-zA-Z0-9/._-]+$/.test(path) && !path.includes("..");
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const authBypass = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
  const mockUserId =
    process.env.NEXT_PUBLIC_MOCK_USER_ID ?? "00000000-0000-0000-0000-000000000001";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables for signed upload" },
      { status: 500 },
    );
  }

  let body: { storagePath?: string; userId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected application/json" }, { status: 400 });
  }

  const storagePath = body.storagePath?.trim();
  const userId = body.userId?.trim();

  if (!storagePath || !userId) {
    return NextResponse.json({ error: "storagePath and userId are required" }, { status: 400 });
  }
  if (!isValidStorageObjectKey(storagePath) || !storagePath.startsWith(`${userId}/hooks/`)) {
    return NextResponse.json({ error: "Invalid storagePath" }, { status: 400 });
  }

  if (!authBypass || userId !== mockUserId) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || data.user?.id !== userId) {
      return NextResponse.json({ error: "Unauthorized upload path" }, { status: 403 });
    }
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await serviceClient.storage
    .from("battle-audio")
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error || !data?.token) {
    return NextResponse.json({ error: error?.message ?? "Could not create signed upload URL" }, { status: 500 });
  }

  return NextResponse.json({ token: data.token, path: data.path });
}
