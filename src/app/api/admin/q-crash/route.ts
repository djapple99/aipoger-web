import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  Q_CRASH_EDITORIAL_COVER_BUCKET,
  Q_CRASH_EDITORIAL_COVER_PREFIX,
  isQCrashEditorialCoverPath,
  qCrashEditorialCanEdit,
  normalizeQCrashFullSongUrl,
} from "@/lib/q-crash-editorial";
import {
  isMissingQCrashEditorialSchema,
  loadQCrashEditorial,
  type QCrashEditorialRow,
} from "@/lib/server-q-crash-editorial";

type AdminClient = ReturnType<typeof adminClient>;

type CardRow = {
  id: string;
  battle_id: string | null;
  founder_queue_id: string;
  challenger_queue_id: string | null;
  status: string;
  duration_minutes: number;
  created_at: string;
  voting_started_at: string | null;
  voting_ends_at: string | null;
  updated_at: string | null;
};

type BattleRow = {
  id: string;
  battle_type: string | null;
  status: string | null;
  winner: "fighter_a" | "fighter_b" | null;
  winner_queue_id: string | null;
  fighter_a_name: string | null;
  fighter_b_name: string | null;
  song_a_name: string | null;
  song_b_name: string | null;
  genre: string | null;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  queue_a_id: string | null;
  queue_b_id: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
  battle_ended_at: string | null;
};

type QueueRow = {
  id: string;
  user_id: string | null;
  fighter_name: string | null;
  original_file_name: string | null;
  genre: string | null;
  ai_tool: string | null;
  cover_url: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() || null : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasField(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function extensionForCover(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function isAllowedCover(file: File) {
  return new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(file.type)
    && file.size > 0
    && file.size <= 10 * 1024 * 1024;
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
  return { admin, userId: data.user.id };
}

async function signedMedia(admin: AdminClient, value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return null;
  if (/^(https?:|data:|blob:|\/)/i.test(clean)) return clean;
  const { data } = await admin.storage.from(Q_CRASH_EDITORIAL_COVER_BUCKET).createSignedUrl(clean, 60 * 60);
  return data?.signedUrl ?? null;
}

async function loadCatalog(admin: AdminClient) {
  const { data: cards, error: cardError } = await admin
    .from("q_crash_cards")
    .select("id,battle_id,founder_queue_id,challenger_queue_id,status,duration_minutes,created_at,voting_started_at,voting_ends_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(120)
    .returns<CardRow[]>();
  if (cardError) {
    if (isMissingQCrashEditorialSchema(cardError.message) || /q_crash_cards|schema cache|does not exist|PGRST/i.test(cardError.message)) {
      return { schemaReady: false, cards: [] };
    }
    throw cardError;
  }

  const cardRows = cards ?? [];
  const battleIds = cardRows.map((card) => card.battle_id).filter((id): id is string => Boolean(id));
  const queueIds = Array.from(new Set(cardRows.flatMap((card) => [card.founder_queue_id, card.challenger_queue_id].filter((id): id is string => Boolean(id)))));
  const [{ data: battles, error: battleError }, { data: queues, error: queueError }, editorial] = await Promise.all([
    battleIds.length > 0
      ? admin
          .from("battles")
          .select("id,battle_type,status,winner,winner_queue_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre,ai_tool_a,ai_tool_b,queue_a_id,queue_b_id,song_a_cover,song_b_cover,battle_ended_at")
          .in("id", battleIds)
          .returns<BattleRow[]>()
      : Promise.resolve({ data: [] as BattleRow[], error: null }),
    queueIds.length > 0
      ? admin
          .from("battle_queue")
          .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,cover_url")
          .in("id", queueIds)
          .returns<QueueRow[]>()
      : Promise.resolve({ data: [] as QueueRow[], error: null }),
    loadQCrashEditorial(admin, queueIds),
  ]);
  if (battleError) throw battleError;
  if (queueError) throw queueError;

  const battleById = new Map((battles ?? []).map((battle) => [battle.id, battle]));
  const queueById = new Map((queues ?? []).map((queue) => [queue.id, queue]));
  const editorialByQueueId = new Map(editorial.rows.map((row) => [row.queue_id, row]));

  const responseCards = await Promise.all(cardRows.map(async (card) => {
    const battle = card.battle_id ? battleById.get(card.battle_id) ?? null : null;
    const queueAId = battle?.queue_a_id || card.founder_queue_id;
    const queueBId = battle?.queue_b_id || card.challenger_queue_id;
    const queueA = queueById.get(queueAId) ?? null;
    const queueB = queueBId ? queueById.get(queueBId) ?? null : null;
    const editorialA = editorialByQueueId.get(queueAId) ?? null;
    const editorialB = queueBId ? editorialByQueueId.get(queueBId) ?? null : null;

    const work = async (args: {
      side: "A" | "B";
      queue: QueueRow | null;
      editorial: QCrashEditorialRow | null;
    }) => {
      const isA = args.side === "A";
      const battleCover = isA ? battle?.song_a_cover : battle?.song_b_cover;
      const coverUrl = await signedMedia(admin, args.editorial?.cover_path || battleCover || args.queue?.cover_url);
      return {
        side: args.side,
        queueId: args.queue?.id ?? (isA ? queueAId : queueBId),
        songName: (isA ? battle?.song_a_name : battle?.song_b_name) || args.queue?.original_file_name || "未命名作品",
        creatorName: (isA ? battle?.fighter_a_name : battle?.fighter_b_name) || args.queue?.fighter_name || "AIPOGER 創作者",
        genre: battle?.genre || args.queue?.genre || "未設定",
        aiTool: (isA ? battle?.ai_tool_a : battle?.ai_tool_b) || args.queue?.ai_tool || "AI Music",
        coverUrl,
        originalCoverUrl: await signedMedia(admin, battleCover || args.queue?.cover_url),
        editorialCoverPath: args.editorial?.cover_path ?? null,
        fullSongUrl: args.editorial?.full_song_url ?? null,
      };
    };

    return {
      id: card.id,
      battleId: card.battle_id,
      status: card.status,
      durationMinutes: card.duration_minutes,
      createdAt: card.created_at,
      votingStartedAt: card.voting_started_at,
      votingEndsAt: card.voting_ends_at,
      updatedAt: card.updated_at,
      winner: battle?.winner ?? null,
      battleEndedAt: battle?.battle_ended_at ?? null,
      editable: qCrashEditorialCanEdit(card.status),
      works: {
        A: await work({ side: "A", queue: queueA, editorial: editorialA }),
        B: queueBId ? await work({ side: "B", queue: queueB, editorial: editorialB }) : null,
      },
    };
  }));

  return { schemaReady: editorial.schemaReady, cards: responseCards };
}

async function findWork(admin: AdminClient, queueId: string) {
  const catalog = await loadCatalog(admin);
  for (const card of catalog.cards) {
    if (card.works.A?.queueId === queueId) return { catalog, card, work: card.works.A };
    if (card.works.B?.queueId === queueId) return { catalog, card, work: card.works.B };
  }
  return { catalog, card: null, work: null };
}

async function currentEditorial(admin: AdminClient, queueId: string) {
  const read = await admin
    .from("q_crash_work_editorial")
    .select("id,queue_id,cover_path,full_song_url,created_at,updated_at,updated_by")
    .eq("queue_id", queueId)
    .maybeSingle<QCrashEditorialRow>();
  if (read.error) throw read.error;
  return read.data ?? null;
}

async function persistEditorial(args: {
  admin: AdminClient;
  userId: string;
  queueId: string;
  previous: QCrashEditorialRow | null;
  coverPath: string | null;
  fullSongUrl: string | null;
}) {
  const { admin, userId, queueId, previous, coverPath, fullSongUrl } = args;
  const { data, error } = await admin
    .from("q_crash_work_editorial")
    .upsert({
      queue_id: queueId,
      cover_path: coverPath,
      full_song_url: fullSongUrl,
      updated_by: userId,
    }, { onConflict: "queue_id" })
    .select("id,queue_id,cover_path,full_song_url,created_at,updated_at,updated_by")
    .single<QCrashEditorialRow>();
  if (error) throw error;

  const { error: auditError } = await admin.from("q_crash_work_editorial_audit").insert({
    queue_id: queueId,
    changed_by: userId,
    previous_cover_path: previous?.cover_path ?? null,
    next_cover_path: coverPath,
    previous_full_song_url: previous?.full_song_url ?? null,
    next_full_song_url: fullSongUrl,
  });
  if (auditError) throw auditError;
  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAdmin(request);
  if ("error" in auth) return auth.error;
  try {
    const catalog = await loadCatalog(auth.admin);
    return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Q Crash 後台資料讀取失敗。", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwnerAdmin(request);
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return jsonError("資料格式不正確。", 400);
  }
  if (body.action !== "update_work") return jsonError("不支援的 Q Crash 編輯動作。", 400);
  const queueId = body.queueId;
  if (!isUuid(queueId)) return jsonError("作品識別碼不正確。", 400);

  try {
    const found = await findWork(auth.admin, queueId);
    if (!found.catalog.schemaReady) return jsonError("Q Crash 編輯資料表尚未啟用。", 503);
    if (!found.card || !found.work) return jsonError("找不到這個 Q Crash 作品。", 404);
    if (!qCrashEditorialCanEdit(found.card.status)) {
      return jsonError(found.card.status === "q_crash_voting" ? "投票進行中，展示資料已鎖定。" : "這場 Q Crash 目前不能編輯。", 409);
    }

    const previous = await currentEditorial(auth.admin, queueId);
    const coverPath = hasField(body, "coverPath") ? cleanText(body.coverPath, 500) : previous?.cover_path ?? null;
    if (coverPath && !isQCrashEditorialCoverPath(coverPath)) return jsonError("封面路徑不正確。", 400);
    const rawFullSongUrl = hasField(body, "fullSongUrl") ? body.fullSongUrl : previous?.full_song_url ?? null;
    const fullSongUrl = normalizeQCrashFullSongUrl(rawFullSongUrl);
    if (typeof rawFullSongUrl === "string" && rawFullSongUrl.trim() && !fullSongUrl) {
      return jsonError("完整版連結只接受 HTTPS 網址。", 400);
    }

    await persistEditorial({ admin: auth.admin, userId: auth.userId, queueId, previous, coverPath, fullSongUrl });
    return NextResponse.json({ message: "Q Crash 展示資料已更新。" });
  } catch (error) {
    if (isMissingQCrashEditorialSchema(error instanceof Error ? error.message : "")) {
      return jsonError("Q Crash 編輯資料表尚未啟用。", 503);
    }
    return jsonError(error instanceof Error ? error.message : "Q Crash 展示資料更新失敗。", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOwnerAdmin(request);
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("封面上傳資料格式不正確。", 400);
  }
  const queueId = form.get("queueId");
  const file = form.get("file");
  if (!isUuid(queueId)) return jsonError("作品識別碼不正確。", 400);
  if (!(file instanceof File)) return jsonError("請選擇封面檔案。", 400);
  if (!isAllowedCover(file)) return jsonError("封面只接受 JPG、PNG、WebP 或 GIF，且不能超過 10MB。", 400);

  try {
    const found = await findWork(auth.admin, queueId);
    if (!found.catalog.schemaReady) return jsonError("Q Crash 編輯資料表尚未啟用。", 503);
    if (!found.card || !found.work) return jsonError("找不到這個 Q Crash 作品。", 404);
    if (!qCrashEditorialCanEdit(found.card.status)) {
      return jsonError(found.card.status === "q_crash_voting" ? "投票進行中，展示資料已鎖定。" : "這場 Q Crash 目前不能編輯。", 409);
    }

    const previous = await currentEditorial(auth.admin, queueId);
    const objectPath = `${Q_CRASH_EDITORIAL_COVER_PREFIX}/${queueId}/${crypto.randomUUID()}.${extensionForCover(file.type)}`;
    const upload = await auth.admin.storage
      .from(Q_CRASH_EDITORIAL_COVER_BUCKET)
      .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;

    try {
      await persistEditorial({
        admin: auth.admin,
        userId: auth.userId,
        queueId,
        previous,
        coverPath: objectPath,
        fullSongUrl: previous?.full_song_url ?? null,
      });
    } catch (error) {
      await auth.admin.storage.from(Q_CRASH_EDITORIAL_COVER_BUCKET).remove([objectPath]);
      throw error;
    }

    if (previous?.cover_path && isQCrashEditorialCoverPath(previous.cover_path) && previous.cover_path !== objectPath) {
      await auth.admin.storage.from(Q_CRASH_EDITORIAL_COVER_BUCKET).remove([previous.cover_path]);
    }
    return NextResponse.json({ message: "Q Crash 封面已更新。" });
  } catch (error) {
    if (isMissingQCrashEditorialSchema(error instanceof Error ? error.message : "")) {
      return jsonError("Q Crash 編輯資料表尚未啟用。", 503);
    }
    return jsonError(error instanceof Error ? error.message : "Q Crash 封面更新失敗。", 500);
  }
}
