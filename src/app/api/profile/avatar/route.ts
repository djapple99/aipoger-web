import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_BUCKET = "avatars";
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

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

function isMissingColumnError(error: unknown, column: string): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return new RegExp(`schema cache|column.*${column}|${column}.*schema cache|PGRST204`, "i").test(text);
}

async function ensureAvatarBucket(admin: ReturnType<typeof adminClient>) {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;
  if (buckets?.some((bucket) => bucket.id === AVATAR_BUCKET)) {
    const { error: updateError } = await admin.storage.updateBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: MAX_AVATAR_BYTES,
      allowedMimeTypes: Array.from(ALLOWED_TYPES),
    });
    if (updateError) throw updateError;
    return;
  }
  const { error: createError } = await admin.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: MAX_AVATAR_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  });
  if (createError) throw createError;
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入後再上傳頭像。", 401);

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) return jsonError("請選擇頭像圖片。");
    if (!ALLOWED_TYPES.has(file.type)) return jsonError("請使用 JPG、PNG、WebP 或 GIF 圖片。");
    if (file.size > MAX_AVATAR_BYTES) return jsonError("頭像單檔最大 2MB。");

    await ensureAvatarBucket(admin);

    const storagePath = `${userData.user.id}/avatar.png`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type || "image/png",
        upsert: true,
      });
    if (uploadError) return jsonError(`頭像上傳失敗：${uploadError.message}`, 500);

    const { data: pub } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const fighterProfile = await admin
      .from("fighter_profiles")
      .upsert({ id: userData.user.id, avatar_url: publicUrl }, { onConflict: "id" });
    if (fighterProfile.error) return jsonError(`鬥士頭像更新失敗：${fighterProfile.error.message}`, 500);

    const userProfile = await admin
      .from("user_profiles")
      .upsert({ id: userData.user.id, avatar_url: publicUrl }, { onConflict: "id" });
    if (userProfile.error && !isMissingColumnError(userProfile.error, "avatar_url")) {
      return jsonError(`頭像資料更新失敗：${userProfile.error.message}`, 500);
    }

    await admin.auth.admin.updateUserById(userData.user.id, {
      user_metadata: {
        ...(userData.user.user_metadata ?? {}),
        avatar_url: publicUrl,
        picture: publicUrl,
      },
    });

    return NextResponse.json({ ok: true, avatarUrl: publicUrl });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
