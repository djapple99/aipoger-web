import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  OFFICIAL_GATEKEEPER_DROP_DEFAULTS,
  OFFICIAL_GATEKEEPER_DROP_IDS,
  normalizeOfficialGatekeeperDrop,
} from "@/lib/official-gatekeeper-drops";
import { attachOfficialGatekeeperMediaUrls } from "@/lib/official-gatekeeper-media";

type AdminClient = ReturnType<typeof adminClient>;

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

function isMissingTable(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /official_gatekeeper_drops|relation.*does not exist|schema cache|PGRST204|42P01/i.test(msg);
}

function isMissingMediaColumns(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /lyrics|cover_path|schema cache|column.*does not exist|PGRST204/i.test(msg);
}

async function requireOwnerAdmin(request: NextRequest): Promise<{ admin: AdminClient; userId: string } | { error: NextResponse }> {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

export async function GET(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireOwnerAdmin>>;
  try {
    auth = await requireOwnerAdmin(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }
  if ("error" in auth) return auth.error;

  let mediaSchemaMissing = false;
  let { data, error } = await auth.admin
    .from("official_gatekeeper_drops")
    .select("*,lyrics,cover_path")
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ schemaMissing: true, drops: OFFICIAL_GATEKEEPER_DROP_DEFAULTS });
    }
    if (isMissingMediaColumns(error)) {
      mediaSchemaMissing = true;
      const legacy = await auth.admin
        .from("official_gatekeeper_drops")
        .select("*")
        .order("sort_order", { ascending: true });
      data = legacy.data;
      error = legacy.error;
    }
    if (error) return jsonError(error.message, 500);
  }

  const dbDrops = new Map(
    await Promise.all(
      (data ?? []).map(async (row) => {
        const drop = normalizeOfficialGatekeeperDrop(row as Record<string, unknown>);
        return [drop.id, await attachOfficialGatekeeperMediaUrls(auth.admin, drop)] as const;
      }),
    ),
  );
  const drops = await Promise.all(
    OFFICIAL_GATEKEEPER_DROP_DEFAULTS.map((fallback) => {
      const drop = dbDrops.get(fallback.id) ?? fallback;
      return attachOfficialGatekeeperMediaUrls(auth.admin, drop);
    }),
  );
  return NextResponse.json({ schemaMissing: false, mediaSchemaMissing, drops });
}

export async function PATCH(request: NextRequest) {
  let auth: Awaited<ReturnType<typeof requireOwnerAdmin>>;
  try {
    auth = await requireOwnerAdmin(request);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    title?: string;
    genre?: string;
    aiTool?: string;
    description?: string | null;
    audioPath?: string | null;
    coverPath?: string | null;
    lyrics?: string | null;
    active?: boolean;
  } | null;

  const id = body?.id?.trim();
  if (!id || !OFFICIAL_GATEKEEPER_DROP_IDS.includes(id as (typeof OFFICIAL_GATEKEEPER_DROP_IDS)[number])) {
    return jsonError("無效的官方守門 Drop。", 400);
  }

  const fallback = OFFICIAL_GATEKEEPER_DROP_DEFAULTS.find((drop) => drop.id === id)!;
  const audioPath = typeof body?.audioPath === "string" && body.audioPath.trim() ? body.audioPath.trim() : null;
  const coverPath = typeof body?.coverPath === "string" && body.coverPath.trim() ? body.coverPath.trim() : null;
  const lyrics = typeof body?.lyrics === "string" && body.lyrics.trim() ? body.lyrics.trim().slice(0, 8000) : null;
  const requestedMediaFields = Boolean(coverPath || lyrics);
  const row = {
    id,
    gate_number: fallback.gateNumber,
    title: cleanText(body?.title, fallback.title, 40),
    genre: cleanText(body?.genre, fallback.genre, 32),
    ai_tool: cleanText(body?.aiTool, fallback.aiTool, 40),
    description: typeof body?.description === "string" && body.description.trim() ? body.description.trim().slice(0, 120) : null,
    audio_path: audioPath,
    cover_path: coverPath,
    lyrics,
    active: Boolean(body?.active && audioPath),
    sort_order: fallback.sortOrder,
    created_by: auth.userId,
    updated_by: auth.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.admin
    .from("official_gatekeeper_drops")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) return jsonError("尚未建立 official_gatekeeper_drops，請先套用 supabase/20260618_official_gatekeeper_drops.sql。", 409);
    if (isMissingMediaColumns(error)) {
      if (requestedMediaFields) return jsonError("官方守門 Drop 缺少封面 / 歌詞欄位。請先套用 supabase/20260619_official_gatekeeper_media.sql。", 409);
      const legacyRow = {
        id: row.id,
        gate_number: row.gate_number,
        title: row.title,
        genre: row.genre,
        ai_tool: row.ai_tool,
        description: row.description,
        audio_path: row.audio_path,
        active: row.active,
        sort_order: row.sort_order,
        created_by: row.created_by,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
      };
      const legacy = await auth.admin
        .from("official_gatekeeper_drops")
        .upsert(legacyRow, { onConflict: "id" })
        .select("*")
        .single();
      if (legacy.error) return jsonError(legacy.error.message, 500);
      const legacyDrop = normalizeOfficialGatekeeperDrop(legacy.data as Record<string, unknown>);
      return NextResponse.json({ drop: await attachOfficialGatekeeperMediaUrls(auth.admin, legacyDrop), mediaSchemaMissing: true });
    }
    return jsonError(error.message, 500);
  }

  const drop = normalizeOfficialGatekeeperDrop(data as Record<string, unknown>);
  return NextResponse.json({ drop: await attachOfficialGatekeeperMediaUrls(auth.admin, drop) });
}
