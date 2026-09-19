import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LISTEN_BAR_AUDIO_BUCKET, LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";

type ListenBarCleanupDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<ListenBarCleanupDatabase>;

type CleanupBody = {
  audioPath?: unknown;
  coverPath?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarCleanupDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanUploadPath(value: unknown, userId: string): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.length > 512) return null;
  if (path.startsWith("/") || path.includes("..") || /[\u0000-\u001f]/.test(path)) return null;
  const prefix = `${userId}/community/`;
  return path.startsWith(prefix) ? path : null;
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入後再清理上傳檔案。", 401);

  const body = (await request.json().catch(() => null)) as CleanupBody | null;
  if (!body) return jsonError("Invalid cleanup payload.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    const audioPath = cleanUploadPath(body.audioPath, userData.user.id);
    const coverPath = cleanUploadPath(body.coverPath, userData.user.id);
    if (!audioPath && !coverPath) return jsonError("No valid upload paths.");

    const results = await Promise.all([
      audioPath ? admin.storage.from(LISTEN_BAR_AUDIO_BUCKET).remove([audioPath]) : Promise.resolve({ data: [], error: null }),
      coverPath ? admin.storage.from(LISTEN_BAR_COVER_BUCKET).remove([coverPath]) : Promise.resolve({ data: [], error: null }),
    ]);
    const errors = results.map((result) => result.error?.message).filter((message): message is string => Boolean(message));
    if (errors.length > 0) return jsonError(errors.join(" / "), 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
