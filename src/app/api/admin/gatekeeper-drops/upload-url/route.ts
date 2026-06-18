import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { OFFICIAL_GATEKEEPER_DROP_IDS } from "@/lib/official-gatekeeper-drops";
import {
  AUDIO_UPLOAD_MAX_BYTES_100MB,
  AUDIO_UPLOAD_MAX_LABEL_100MB,
} from "@/lib/audio-upload-policy";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeAudioFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || `gatekeeper-drop-${Date.now()}.mp3`;
}

export async function POST(request: NextRequest) {
  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入。", 401);

  const { data, error: userError } = await admin.auth.getUser(token);
  if (userError || !data.user) return jsonError("登入狀態已過期。", 401);
  if (!isAdminEmail(data.user.email)) return jsonError("沒有後台權限。", 403);

  const body = (await request.json().catch(() => null)) as { id?: string; fileName?: string; fileSize?: number } | null;
  const id = body?.id?.trim();
  if (!id || !OFFICIAL_GATEKEEPER_DROP_IDS.includes(id as (typeof OFFICIAL_GATEKEEPER_DROP_IDS)[number])) {
    return jsonError("無效的官方守門 Drop。", 400);
  }
  if (typeof body?.fileSize === "number" && body.fileSize > AUDIO_UPLOAD_MAX_BYTES_100MB) {
    return jsonError(`官方守門 Drop 單檔上限是 ${AUDIO_UPLOAD_MAX_LABEL_100MB}。`, 413);
  }

  const storagePath = `official-gatekeeper-drops/${id}/${Date.now()}-${safeAudioFileName(body?.fileName ?? "drop.mp3")}`;
  const { data: signed, error } = await admin.storage
    .from("battle-audio")
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error || !signed?.token) {
    return jsonError(error?.message ?? "無法建立上傳連結。", 500);
  }

  return NextResponse.json({ token: signed.token, path: signed.path });
}
