import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";

const SOCIAL_MEDIA_BUCKET = "social-media-assets";
const SOCIAL_MEDIA_MAX_BYTES = 300 * 1024 * 1024;
const SOCIAL_MEDIA_MAX_LABEL = "300MB";
const ALLOWED_SOCIAL_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const MIME_BY_EXTENSION: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  mov: "video/quicktime",
  mp4: "video/mp4",
  png: "image/png",
  webm: "video/webm",
  webp: "image/webp",
};

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

function safeStorageFileName(name: string, fallback: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 120) || fallback;
}

function contentTypeForFile(fileName: string, inputContentType: string | null | undefined) {
  const cleanContentType = inputContentType?.trim().toLowerCase() ?? "";
  if (ALLOWED_SOCIAL_MEDIA_MIME_TYPES.has(cleanContentType)) return cleanContentType;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "";
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

async function ensureSocialMediaBucket(admin: ReturnType<typeof adminClient>) {
  const { data: bucket } = await admin.storage.getBucket(SOCIAL_MEDIA_BUCKET);
  const options = {
    public: true,
    fileSizeLimit: SOCIAL_MEDIA_MAX_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_SOCIAL_MEDIA_MIME_TYPES),
  };
  if (!bucket) {
    const { error } = await admin.storage.createBucket(SOCIAL_MEDIA_BUCKET, options);
    if (error) throw error;
    return;
  }
  const { error } = await admin.storage.updateBucket(SOCIAL_MEDIA_BUCKET, options);
  if (error) throw error;
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if ("error" in guard) return guard.error;
    const body = (await request.json().catch(() => null)) as { fileName?: string; fileSize?: number; contentType?: string } | null;
    const fileName = body?.fileName?.trim() || "aipoger-social-media.mp4";
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : 0;
    if (fileSize <= 0) return jsonError("素材檔案大小無效。", 400);
    if (fileSize > SOCIAL_MEDIA_MAX_BYTES) return jsonError(`社群素材上限是 ${SOCIAL_MEDIA_MAX_LABEL}。`, 413);

    const contentType = contentTypeForFile(fileName, body?.contentType);
    if (!contentType) return jsonError("素材格式不支援。請使用 JPG / PNG / WebP / GIF / MP4 / MOV / WebM。", 400);

    await ensureSocialMediaBucket(guard.admin);
    const safeName = safeStorageFileName(fileName, contentType.startsWith("image/") ? "image.jpg" : "video.mp4");
    const storagePath = `${guard.userId}/daily-spotlight/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { data: signed, error } = await guard.admin.storage
      .from(SOCIAL_MEDIA_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: true });
    if (error || !signed?.token) return jsonError(error?.message ?? "無法建立素材上傳連結。", 500);

    const { data: publicUrl } = guard.admin.storage.from(SOCIAL_MEDIA_BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({
      bucket: SOCIAL_MEDIA_BUCKET,
      path: signed.path,
      token: signed.token,
      publicUrl: publicUrl.publicUrl,
      contentType,
      maxBytes: SOCIAL_MEDIA_MAX_BYTES,
    });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
