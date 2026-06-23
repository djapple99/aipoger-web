import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { battleResultShortPath, battleShortPath, isUuid } from "@/lib/share-short-links";
import {
  SOCIAL_PLATFORMS,
  buildBattleSocialDraft,
  buildManualSocialDraft,
  type BattleSocialDraftInput,
  type SocialPlatform,
  type SocialPostStatus,
  type SocialPublishMode,
  type SocialTargetDraft,
} from "@/lib/social-posting";

type AdminClient = ReturnType<typeof adminClient>;

type SocialTargetRow = {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  publish_mode: SocialPublishMode;
  status: SocialPostStatus;
  title: string;
  content_text: string;
  target_url: string | null;
  manual_publish_url: string | null;
  media_url: string | null;
  background_audio_url: string | null;
  background_audio_label: string | null;
  notes: string | null;
  external_post_id: string | null;
  error_message: string | null;
  last_attempt_at: string | null;
  published_at: string | null;
  updated_at: string | null;
};

type SocialPostRow = {
  id: string;
  source_type: "manual" | "battle_result";
  source_id: string | null;
  language: string;
  title: string;
  body: string | null;
  cta: string | null;
  link_url: string | null;
  status: SocialPostStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  social_post_targets?: SocialTargetRow[];
};

type BattleArchiveRow = {
  id: string;
  battle_id: string;
  battle_code: string | null;
  winner: "fighter_a" | "fighter_b" | null;
  winner_name: string | null;
  winner_song_name: string | null;
  winner_ai_tool: string | null;
  opponent_name: string | null;
  opponent_song_name: string | null;
  final_vote_left: number | null;
  final_vote_right: number | null;
  total_votes: number | null;
  result_payload: Record<string, unknown> | null;
  archived_at: string | null;
};

type BattleRow = {
  id: string;
  winner: "fighter_a" | "fighter_b" | null;
  genre: string | null;
  audio_a_path: string | null;
  audio_b_path: string | null;
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

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

function isMissingSocialSchema(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /social_posts|social_post_targets|social_accounts|social_publish_attempts|schema cache|relation.*does not exist|PGRST20|42P01/i.test(msg);
}

function clean(value: unknown, maxLength = 4000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
}

function absoluteUrl(pathOrUrl: string | null | undefined) {
  const value = clean(pathOrUrl, 1000);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteOrigin()}${value.startsWith("/") ? value : `/${value}`}`;
}

async function signedBattleAudioUrl(admin: AdminClient, path: string | null | undefined) {
  const value = clean(path, 1000);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await admin.storage.from("battle-audio").createSignedUrl(value, 60 * 10);
  if (error) return "";
  return data?.signedUrl ?? "";
}

function normalizePlatform(value: unknown): SocialPlatform | null {
  return SOCIAL_PLATFORMS.includes(value as SocialPlatform) ? (value as SocialPlatform) : null;
}

async function loadSocialPosts(admin: AdminClient) {
  const { data, error } = await admin
    .from("social_posts")
    .select("*,social_post_targets(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as unknown as SocialPostRow[];
}

async function loadRecentBattleResults(admin: AdminClient) {
  const { data, error } = await admin
    .from("battle_result_archives")
    .select("id,battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,result_payload,archived_at")
    .gt("total_votes", 0)
    .order("archived_at", { ascending: false })
    .limit(30);

  if (error) {
    const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""} ${error.code ?? ""}`;
    if (/battle_result_archives|relation.*does not exist|schema cache|PGRST20|42P01/i.test(msg)) return [];
    throw error;
  }
  return (data ?? []) as unknown as BattleArchiveRow[];
}

async function loadAccounts(admin: AdminClient) {
  const { data, error } = await admin
    .from("social_accounts")
    .select("platform,display_name,connection_status,token_hint,metadata,updated_at")
    .order("platform", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function insertDraftBundle(
  admin: AdminClient,
  userId: string,
  params: {
    title: string;
    sourceType: "manual" | "battle_result";
    sourceId: string | null;
    body?: string | null;
    cta?: string | null;
    linkUrl?: string | null;
    scheduledAt?: string | null;
    targets: SocialTargetDraft[];
  },
) {
  const now = new Date().toISOString();
  const { data: post, error: postError } = await admin
    .from("social_posts")
    .insert({
      source_type: params.sourceType,
      source_id: params.sourceId,
      language: "zh",
      title: params.title,
      body: params.body ?? null,
      cta: params.cta ?? null,
      link_url: params.linkUrl ?? null,
      status: "needs_review",
      scheduled_at: params.scheduledAt ?? null,
      created_by: userId,
      updated_at: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (postError) throw postError;

  const rows = params.targets.map((item) => ({
    post_id: post.id,
    platform: item.platform,
    publish_mode: item.publishMode,
    status: item.status,
    title: item.title,
    content_text: item.content,
    target_url: item.targetUrl,
    manual_publish_url: item.manualPublishUrl,
    background_audio_url: item.backgroundAudioUrl,
    background_audio_label: item.backgroundAudioLabel,
    notes: item.notes,
    updated_at: now,
  }));
  const { error: targetError } = await admin.from("social_post_targets").insert(rows);
  if (targetError) throw targetError;
  return post.id;
}

async function loadBattleDraftInput(admin: AdminClient, battleId: string): Promise<BattleSocialDraftInput | null> {
  const { data: archive, error: archiveError } = await admin
    .from("battle_result_archives")
    .select("id,battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,result_payload,archived_at")
    .eq("battle_id", battleId)
    .maybeSingle<BattleArchiveRow>();
  if (archiveError) throw archiveError;
  if (!archive || !archive.winner || !archive.battle_id || (archive.total_votes ?? 0) <= 0) return null;

  const { data: battle } = await admin
    .from("battles")
    .select("id,winner,genre,audio_a_path,audio_b_path")
    .eq("id", battleId)
    .maybeSingle<BattleRow>();

  const payload = typeof archive.result_payload === "object" && archive.result_payload ? archive.result_payload : {};
  const winnerAudioPath = archive.winner === "fighter_b" ? battle?.audio_b_path : battle?.audio_a_path;
  const backgroundAudioUrl = await signedBattleAudioUrl(admin, winnerAudioPath);
  return {
    battleId: archive.battle_id,
    battleCode: archive.battle_code,
    winnerSide: archive.winner,
    winnerName: archive.winner_name ?? "",
    winnerSong: archive.winner_song_name ?? "",
    opponentName: archive.opponent_name ?? "",
    opponentSong: archive.opponent_song_name ?? "",
    genre: clean(payload.genre) || battle?.genre || "AI Music",
    finalVoteLeft: archive.final_vote_left ?? 0,
    finalVoteRight: archive.final_vote_right ?? 0,
    totalVotes: archive.total_votes ?? 0,
    resultUrl: absoluteUrl(battleResultShortPath(archive.battle_id, "zh")),
    battleUrl: absoluteUrl(battleShortPath(archive.battle_id, "zh")),
    backgroundAudioUrl,
  };
}

async function markPostAggregateStatus(admin: AdminClient, postId: string) {
  const { data: targets } = await admin
    .from("social_post_targets")
    .select("status,publish_mode")
    .eq("post_id", postId);
  const rows = (targets ?? []) as { status: string; publish_mode: string }[];
  const apiTargets = rows.filter((row) => row.publish_mode === "api");
  const allApiPublished = apiTargets.length > 0 && apiTargets.every((row) => row.status === "published");
  const anyFailed = rows.some((row) => row.status === "failed");
  await admin
    .from("social_posts")
    .update({
      status: anyFailed ? "failed" : allApiPublished ? "published" : "scheduled",
      published_at: allApiPublished ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
}

async function publishDiscord(content: string) {
  const webhookUrl = process.env.SOCIAL_DISCORD_WEBHOOK_URL ?? process.env.DISCORD_SOCIAL_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("Discord webhook 尚未設定。請設定 SOCIAL_DISCORD_WEBHOOK_URL。");
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "AIPOGER Social Desk",
      content: content.slice(0, 1900),
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) throw new Error(`Discord 發布失敗：HTTP ${response.status}`);
  return { externalPostId: null };
}

async function publishX(content: string) {
  const token = process.env.X_API_BEARER_TOKEN ?? process.env.SOCIAL_X_BEARER_TOKEN;
  if (!token) throw new Error("X token 尚未設定。請設定 X_API_BEARER_TOKEN。");
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: content.slice(0, 280) }),
  });
  const payload = (await response.json().catch(() => null)) as { data?: { id?: string }; detail?: string; title?: string } | null;
  if (!response.ok) throw new Error(payload?.detail || payload?.title || `X 發布失敗：HTTP ${response.status}`);
  return { externalPostId: payload?.data?.id ?? null };
}

async function publishTarget(admin: AdminClient, userId: string, targetId: string) {
  const { data: targetRow, error } = await admin
    .from("social_post_targets")
    .select("*")
    .eq("id", targetId)
    .maybeSingle<SocialTargetRow>();
  if (error) throw error;
  if (!targetRow) throw new Error("找不到平台草稿。");
  if (targetRow.publish_mode !== "api") throw new Error("這個平台第一版不是 API 直發，請用手動發布流程。");

  const now = new Date().toISOString();
  try {
    const result =
      targetRow.platform === "discord"
        ? await publishDiscord(targetRow.content_text)
        : targetRow.platform === "x"
          ? await publishX(targetRow.content_text)
          : null;
    if (!result) throw new Error("這個平台尚未支援 API 直發。");

    await admin
      .from("social_post_targets")
      .update({
        status: "published",
        external_post_id: result.externalPostId,
        error_message: null,
        last_attempt_at: now,
        published_at: now,
        updated_at: now,
      })
      .eq("id", targetId);
    await admin.from("social_publish_attempts").insert({
      post_id: targetRow.post_id,
      target_id: targetRow.id,
      platform: targetRow.platform,
      attempted_by: userId,
      status: "published",
      request_summary: { title: targetRow.title },
      response_summary: result,
    });
    await markPostAggregateStatus(admin, targetRow.post_id);
    return { ok: true };
  } catch (publishError) {
    const message = publishError instanceof Error ? publishError.message : "發布失敗。";
    await admin
      .from("social_post_targets")
      .update({ status: "failed", error_message: message, last_attempt_at: now, updated_at: now })
      .eq("id", targetId);
    await admin.from("social_publish_attempts").insert({
      post_id: targetRow.post_id,
      target_id: targetRow.id,
      platform: targetRow.platform,
      attempted_by: userId,
      status: "failed",
      request_summary: { title: targetRow.title },
      error_message: message,
    });
    await markPostAggregateStatus(admin, targetRow.post_id);
    throw new Error(message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOwnerAdmin(request);
    if ("error" in auth) return auth.error;
    const [posts, recentBattleResults, accounts] = await Promise.all([
      loadSocialPosts(auth.admin),
      loadRecentBattleResults(auth.admin),
      loadAccounts(auth.admin).catch((error) => {
        if (isMissingSocialSchema(error)) return [];
        throw error;
      }),
    ]);
    return NextResponse.json({ posts, recentBattleResults, accounts });
  } catch (error) {
    if (isMissingSocialSchema(error as { message?: string })) {
      return jsonError("社群發文資料表尚未建立，請先套用 supabase/20260623_social_posting.sql。", 503);
    }
    return jsonError(error instanceof Error ? error.message : "社群後台讀取失敗。", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwnerAdmin(request);
    if ("error" in auth) return auth.error;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = clean(body?.action, 80);
    const admin = auth.admin;

    if (action === "create_manual_draft") {
      const bundle = buildManualSocialDraft({
        topic: clean(body?.topic, 120),
        body: clean(body?.body, 2000),
        cta: clean(body?.cta, 400),
        linkUrl: clean(body?.linkUrl, 1000),
        backgroundAudioUrl: clean(body?.backgroundAudioUrl, 1000),
        backgroundAudioLabel: clean(body?.backgroundAudioLabel, 160),
      });
      const postId = await insertDraftBundle(admin, auth.userId, {
        title: bundle.title,
        sourceType: "manual",
        sourceId: null,
        body: clean(body?.body, 2000),
        cta: clean(body?.cta, 400),
        linkUrl: clean(body?.linkUrl, 1000),
        scheduledAt: clean(body?.scheduledAt, 80) || null,
        targets: bundle.targets,
      });
      return NextResponse.json({ ok: true, postId });
    }

    if (action === "create_battle_draft") {
      const battleId = clean(body?.battleId, 80);
      if (!isUuid(battleId)) return jsonError("請選擇有效的 battle。");
      const input = await loadBattleDraftInput(admin, battleId);
      if (!input) return jsonError("這場 battle 沒有有效觀眾票，或尚未產生戰報。", 409);
      const bundle = buildBattleSocialDraft(input);
      if (!bundle) return jsonError("0 票 no contest 不產生 Winner Circle 戰報。", 409);
      const postId = await insertDraftBundle(admin, auth.userId, {
        title: bundle.title,
        sourceType: "battle_result",
        sourceId: battleId,
        linkUrl: input.resultUrl,
        scheduledAt: clean(body?.scheduledAt, 80) || null,
        targets: bundle.targets,
      });
      return NextResponse.json({ ok: true, postId });
    }

    if (action === "approve_post") {
      const postId = clean(body?.postId, 80);
      if (!isUuid(postId)) return jsonError("Missing postId");
      const now = new Date().toISOString();
      const { error } = await admin
        .from("social_posts")
        .update({ status: "scheduled", approved_at: now, approved_by: auth.userId, updated_at: now })
        .eq("id", postId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_post") {
      const postId = clean(body?.postId, 80);
      if (!isUuid(postId)) return jsonError("Missing postId");
      const { data: post, error: loadError } = await admin
        .from("social_posts")
        .select("id,title,status")
        .eq("id", postId)
        .maybeSingle<{ id: string; title: string; status: SocialPostStatus }>();
      if (loadError) throw loadError;
      if (!post) return jsonError("找不到這筆草稿。", 404);
      if (post.status === "published") return jsonError("已發布的社群紀錄不允許直接刪除，請保留發布紀錄。", 409);
      const { error } = await admin.from("social_posts").delete().eq("id", postId);
      if (error) throw error;
      return NextResponse.json({ ok: true, deletedPost: post });
    }

    if (action === "publish_target") {
      const targetId = clean(body?.targetId, 80);
      if (!isUuid(targetId)) return jsonError("Missing targetId");
      await publishTarget(admin, auth.userId, targetId);
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_manual_published") {
      const targetId = clean(body?.targetId, 80);
      if (!isUuid(targetId)) return jsonError("Missing targetId");
      const now = new Date().toISOString();
      const { data: targetRow, error: loadError } = await admin
        .from("social_post_targets")
        .select("id,post_id,platform")
        .eq("id", targetId)
        .maybeSingle<{ id: string; post_id: string; platform: SocialPlatform }>();
      if (loadError) throw loadError;
      if (!targetRow) return jsonError("找不到平台草稿。", 404);
      const { error } = await admin
        .from("social_post_targets")
        .update({ status: "published", error_message: null, last_attempt_at: now, published_at: now, updated_at: now })
        .eq("id", targetId);
      if (error) throw error;
      await admin.from("social_publish_attempts").insert({
        post_id: targetRow.post_id,
        target_id: targetRow.id,
        platform: targetRow.platform,
        attempted_by: auth.userId,
        status: "published",
        request_summary: { mode: "manual_confirmed" },
      });
      await markPostAggregateStatus(admin, targetRow.post_id);
      return NextResponse.json({ ok: true });
    }

    if (action === "update_target") {
      const targetId = clean(body?.targetId, 80);
      const platform = normalizePlatform(body?.platform);
      if (!isUuid(targetId)) return jsonError("Missing targetId");
      const update: Record<string, unknown> = {
        title: clean(body?.title, 200),
        content_text: clean(body?.content, 6000),
        target_url: clean(body?.targetUrl, 1000) || null,
        background_audio_url: clean(body?.backgroundAudioUrl, 1000) || null,
        background_audio_label: clean(body?.backgroundAudioLabel, 160) || null,
        updated_at: new Date().toISOString(),
      };
      if (platform) update.platform = platform;
      const { error } = await admin.from("social_post_targets").update(update).eq("id", targetId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return jsonError("未知的社群後台操作。");
  } catch (error) {
    if (isMissingSocialSchema(error as { message?: string })) {
      return jsonError("社群發文資料表尚未建立，請先套用 supabase/20260623_social_posting.sql。", 503);
    }
    return jsonError(error instanceof Error ? error.message : "社群後台操作失敗。", 500);
  }
}
