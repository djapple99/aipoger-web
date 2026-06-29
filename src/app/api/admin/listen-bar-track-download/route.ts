import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { LISTEN_BAR_AUDIO_BUCKET } from "@/lib/listen-bar";

type DownloadTrackRow = {
  id: string;
  title: string | null;
  artist: string | null;
  audio_path: string | null;
};

const SIGNED_URL_TTL_SECONDS = 60 * 10;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin };
}

function extensionFromPath(path: string) {
  const cleanPath = path.split("?")[0]?.split("#")[0] ?? "";
  const fileName = cleanPath.split("/").pop() ?? "";
  const match = fileName.match(/\.([a-z0-9]{2,8})$/i);
  return match ? `.${match[1].toLowerCase()}` : ".mp3";
}

function safeDownloadFileName(track: DownloadTrackRow) {
  const title = track.title?.trim() || "aipoger-track";
  const artist = track.artist?.trim() || "creator";
  const baseName = `${artist}-${title}`
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 90) || `aipoger-track-${track.id.slice(0, 8)}`;
  return `${baseName}${extensionFromPath(track.audio_path ?? "")}`;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if ("error" in guard) return guard.error;

    const trackId = request.nextUrl.searchParams.get("trackId");
    if (!isUuid(trackId)) return jsonError("缺少歌曲 ID。", 400);

    const { data: track, error: trackError } = await guard.admin
      .from("listen_bar_tracks")
      .select("id,title,artist,audio_path")
      .eq("id", trackId)
      .maybeSingle<DownloadTrackRow>();
    if (trackError) return jsonError(trackError.message, 500);
    if (!track?.audio_path?.trim()) return jsonError("這首歌沒有可下載的原始音檔。", 404);

    const audioPath = track.audio_path.trim();
    if (/^https?:\/\//i.test(audioPath)) {
      return NextResponse.json({
        url: audioPath,
        fileName: safeDownloadFileName(track),
        expiresInSeconds: null,
      });
    }

    const fileName = safeDownloadFileName(track);
    const { data, error } = await guard.admin
      .storage
      .from(LISTEN_BAR_AUDIO_BUCKET)
      .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS, { download: fileName });
    if (error || !data?.signedUrl) return jsonError(error?.message || "原檔下載連結建立失敗。", 500);

    return NextResponse.json({
      url: data.signedUrl,
      fileName,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
