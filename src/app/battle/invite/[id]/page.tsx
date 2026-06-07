import type { Metadata } from "next";
import Link from "next/link";
import { getBattleOgData, siteOrigin } from "@/lib/battle-og";
import { isDropChallengeAcceptable } from "@/lib/battle-pool-client";

type InviteSearchParams = Record<string, string | string[] | undefined>;

type BattleInvitePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<InviteSearchParams>;
};

function firstParam(params: InviteSearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function cleanParam(value: string, fallback: string) {
  return value.trim() || fallback;
}

function formatTaiwanTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const DROP_BATTLE_CANCELLATION_DELAY_MS = 60 * 1000;
const ACCEPTED_HOOK_STATUSES = new Set(["matched", "active", "completed", "public_voting", "ghost_battle"]);
const CLOSED_HOOK_STATUSES = new Set(["expired", "cancelled", "cancelled_no_challenger", "cancelled_founder"]);

function resolveHookStartAt(data: {
  scheduledStartAt?: string | null;
  cancellationEvaluationAt?: string | null;
  expiresAt?: string | null;
}) {
  const scheduledMs = new Date(data.scheduledStartAt ?? "").getTime();
  if (Number.isFinite(scheduledMs)) return new Date(scheduledMs).toISOString();

  const cancellationMs = new Date(data.cancellationEvaluationAt ?? "").getTime();
  if (Number.isFinite(cancellationMs)) {
    return new Date(cancellationMs - DROP_BATTLE_CANCELLATION_DELAY_MS).toISOString();
  }

  const expiresMs = new Date(data.expiresAt ?? "").getTime();
  return Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null;
}

async function inviteData(id: string, searchParams: InviteSearchParams) {
  const battle = await getBattleOgData(id);
  const isHookCard = firstParam(searchParams, "type") === "hook-card";
  const hasRightFighter = Boolean(battle.fighter_b_user_id || (battle.fighter_b_name && battle.fighter_b_name !== "DROP RIVAL" && battle.fighter_b_name !== "等待挑戰者"));
  const hasRightSong = Boolean(battle.song_b_name && battle.song_b_name !== "Battle Drop" && battle.song_b_name !== "你的 45s Drop" && battle.song_b_name !== "你的 45s Hook");
  return {
    genre: cleanParam(firstParam(searchParams, "g"), battle.genre || "AI Music Drop Battle"),
    leftName: cleanParam(firstParam(searchParams, "l"), battle.fighter_a_name),
    rightName: cleanParam(firstParam(searchParams, "r"), isHookCard && !hasRightFighter ? "等待挑戰者" : battle.fighter_b_name),
    leftSong: cleanParam(firstParam(searchParams, "ls"), battle.song_a_name),
    rightSong: cleanParam(firstParam(searchParams, "rs"), isHookCard && !hasRightSong ? "挑戰者 Drop" : battle.song_b_name),
    leftCover: cleanParam(firstParam(searchParams, "lc"), battle.song_a_cover || ""),
    rightCover: cleanParam(firstParam(searchParams, "rc"), battle.song_b_cover || ""),
    leftAvatar: cleanParam(firstParam(searchParams, "la"), battle.fighter_a_avatar || ""),
    rightAvatar: cleanParam(firstParam(searchParams, "ra"), battle.fighter_b_avatar || ""),
    leftTool: cleanParam(firstParam(searchParams, "ta") || firstParam(searchParams, "tool"), battle.ai_tool_a || "AI Music"),
    rightTool: cleanParam(firstParam(searchParams, "tb"), isHookCard ? "挑戰者進場後顯示" : battle.ai_tool_b || "AI Music"),
    battleType: cleanParam(firstParam(searchParams, "bt"), isHookCard ? "90s Drop Battle 戰帖" : "90s Drop Battle"),
    matchGroupId: battle.match_group_id || null,
    queueStatus: battle.queue_status || null,
    expiresAt: battle.expires_at || null,
    scheduledStartAt: battle.scheduled_start_at || null,
    cancellationEvaluationAt: battle.cancellation_evaluation_at || null,
  };
}

function destinationHref(id: string, searchParams: InviteSearchParams) {
  const lang = cleanParam(firstParam(searchParams, "lang"), "zh");
  const destination = new URLSearchParams({ lang });
  const toWaitingRoom = firstParam(searchParams, "to") === "waiting";
  const toResult = firstParam(searchParams, "to") === "result";
  const startedAt = firstParam(searchParams, "s");
  const firstDeck = firstParam(searchParams, "fd");
  if (startedAt) destination.set("battleStartedAtMs", startedAt);
  if (firstDeck) destination.set("firstDeck", firstDeck);
  if (id.startsWith("mock-") || toWaitingRoom) {
    const leftName = firstParam(searchParams, "l");
    const leftSong = firstParam(searchParams, "ls");
    const genre = firstParam(searchParams, "g");
    const tool = firstParam(searchParams, "tool");
    const leftCover = firstParam(searchParams, "lc");
    const leftAvatar = firstParam(searchParams, "la");
    if (leftName) destination.set("fighterName", leftName);
    if (leftSong) destination.set("songName", leftSong);
    if (genre) destination.set("genre", genre);
    if (tool) destination.set("aiTool", tool);
    if (leftCover) destination.set("coverUrl", leftCover);
    if (leftAvatar) destination.set("avatarUrl", leftAvatar);
  }
  const path = toResult
    ? `/battle/result`
    : `/battle/${encodeURIComponent(id)}`;
  if (toResult) destination.set("battleId", id);
  return `${path}?${destination.toString()}`;
}

export async function generateMetadata({ params, searchParams }: BattleInvitePageProps): Promise<Metadata> {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const data = await inviteData(id, resolvedSearchParams);
  const origin = siteOrigin();
  const query = new URLSearchParams();
  query.set("l", data.leftName);
  query.set("r", data.rightName);
  query.set("ls", data.leftSong);
  query.set("rs", data.rightSong);
  query.set("g", data.genre);
  query.set("ta", data.leftTool);
  query.set("tb", data.rightTool);
  query.set("bt", data.battleType);
  if (data.leftCover) query.set("lc", data.leftCover);
  if (data.rightCover) query.set("rc", data.rightCover);
  if (data.leftAvatar) query.set("la", data.leftAvatar);
  if (data.rightAvatar) query.set("ra", data.rightAvatar);
  const canonical = `${origin}/battle/invite/${encodeURIComponent(id)}`;
  const image = `${canonical}/opengraph-image?${query.toString()}`;
  const title = `AIPOGER 90S 最強Drop Battle 抓波戰帖｜${data.leftName} VS ${data.rightName}`;
  const isHookCard = firstParam(resolvedSearchParams, "type") === "hook-card" || data.rightName === "等待挑戰者";
  const hookStartAt = resolveHookStartAt(data);
  const startTimeLabel = formatTaiwanTime(hookStartAt);
  const startReminder = startTimeLabel
    ? `開戰時間: ${startTimeLabel}（台灣時間）。請大家提前進場。`
    : "請大家提前進場。";
  const description = isHookCard
    ? `${data.leftName}的《${data.leftSong}》AIPOGER Drop Battle 戰帖已開。${startReminder}進來聊天預測支持誰的歌最熱血最動人，或是你來挑戰？Show me what you got!!!`
    : `${data.battleType}｜${data.leftName}《${data.leftSong}》(${data.leftTool}) VS ${data.rightName}《${data.rightSong}》(${data.rightTool})｜進場聊天預測支持誰的歌最熱血最動人。`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BattleInvitePage({ params, searchParams }: BattleInvitePageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const data = await inviteData(id, resolvedSearchParams);
  const lang = cleanParam(firstParam(resolvedSearchParams, "lang"), "zh");
  const href = destinationHref(id, resolvedSearchParams);
  const isHookCard =
    firstParam(resolvedSearchParams, "type") === "hook-card" ||
    data.rightName === "等待挑戰者" ||
    data.rightSong === "你的 45s Drop" || data.rightSong === "你的 45s Hook";
  const isResultInvite = firstParam(resolvedSearchParams, "to") === "result";
  const hookStartAt = resolveHookStartAt(data);
  const startTimeLabel = formatTaiwanTime(hookStartAt);
  const hookStatus = data.queueStatus || "";
  const isHookExpired =
    isHookCard &&
    (CLOSED_HOOK_STATUSES.has(hookStatus) ||
      Boolean(
        (data.queueStatus || data.cancellationEvaluationAt || data.scheduledStartAt || data.expiresAt) &&
          !isDropChallengeAcceptable({
            status: data.queueStatus,
            expires_at: data.expiresAt,
            scheduled_start_at: data.scheduledStartAt,
            cancellation_evaluation_at: data.cancellationEvaluationAt,
          }) &&
          !ACCEPTED_HOOK_STATUSES.has(hookStatus) &&
          !data.matchGroupId,
      ));
  const isHookAccepted = isHookCard && !isHookExpired && (Boolean(data.matchGroupId) || ACCEPTED_HOOK_STATUSES.has(hookStatus));
  const isLegacyOpenHookCard = isHookCard && !data.queueStatus && !data.matchGroupId && !isHookExpired;
  const canAcceptHook =
    isHookCard &&
    !isHookExpired &&
    !isHookAccepted &&
    (isLegacyOpenHookCard ||
      isDropChallengeAcceptable({
        status: data.queueStatus,
        expires_at: data.expiresAt,
        scheduled_start_at: data.scheduledStartAt,
        cancellation_evaluation_at: data.cancellationEvaluationAt,
      }));
  const acceptParams = new URLSearchParams({
    lang,
  });
  const acceptHref = `/battle/accept/${encodeURIComponent(id)}?${acceptParams.toString()}`;
  const spectateId = data.matchGroupId || id;
  const spectateHref = `/battle/${encodeURIComponent(spectateId)}?lang=${encodeURIComponent(lang)}`;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden overflow-y-auto bg-[#050505] px-4 py-12 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_14%,rgba(255,106,0,0.24),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(0,203,255,0.14),transparent_30%),linear-gradient(180deg,#050505,#0b0908)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <section className="relative z-10 w-full max-w-5xl rounded-[2rem] border border-orange-300/35 bg-[radial-gradient(circle_at_20%_10%,rgba(255,106,0,0.24),transparent_34%),linear-gradient(180deg,#100704,#030303)] px-5 py-7 text-center shadow-[0_0_80px_rgba(255,106,0,0.18)] sm:px-8 md:px-12">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-200/80">
          {isResultInvite ? "AIPOGER DROP BATTLE RESULT CARD" : isHookCard ? "AIPOGER DROP BATTLE ARENA CARD" : "AIPOGER LIVE BATTLE"}
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl break-words text-[clamp(2.6rem,8vw,5.6rem)] font-black leading-[0.98] tracking-normal text-white">
          <span>{data.leftName}</span> <span className="text-orange-300">VS</span>{" "}
          <span>{data.rightName}</span>
        </h1>
        <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="min-w-0 rounded-2xl border border-orange-300/20 bg-orange-500/8 px-4 py-3">
            <p className="truncate text-lg font-black text-white">{data.leftSong}</p>
            <p className="mt-1 w-fit max-w-full truncate rounded-full border border-orange-200/25 bg-black/28 px-2.5 py-1 text-[11px] font-black text-orange-100">
              {data.leftTool}
            </p>
          </div>
          <span className="text-center text-sm font-black text-orange-200/70">對上</span>
          <div className="min-w-0 rounded-2xl border border-cyan-200/20 bg-cyan-300/8 px-4 py-3">
            <p className="truncate text-lg font-black text-white">{data.rightSong}</p>
            <p className="mt-1 w-fit max-w-full truncate rounded-full border border-cyan-200/25 bg-black/28 px-2.5 py-1 text-[11px] font-black text-cyan-100">
              {data.rightTool}
            </p>
          </div>
        </div>
        {isHookCard && startTimeLabel ? (
          <p className="mx-auto mt-3 w-fit rounded-full border border-orange-200/35 bg-orange-400/10 px-4 py-2 text-sm font-black text-orange-50">
            開戰時間: {startTimeLabel}（台灣時間） · 請提前進場
          </p>
        ) : null}
        {isHookCard && !isHookExpired ? (
          <p className="mx-auto mt-3 w-fit rounded-full border border-red-200/80 bg-red-600 px-5 py-2 text-sm font-black tracking-[0.12em] text-white shadow-[0_0_28px_rgba(220,38,38,0.24)]">
            5 秒預播
          </p>
        ) : null}
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
          {isResultInvite
            ? "這是一張 AIPOGER Drop Battle 戰果卡。進場查看完整結果與榮譽卡。"
            : isHookCard
            ? isHookExpired
              ? "這張公開最強抓波 Drop Battle 戰帖已過期。可以回鬥歌場找新的戰帖。"
              : (
                <>
                  這是一張公開最強抓波 Drop Battle 戰帖。
                  {startTimeLabel ? (
                    <>
                      開戰時間 <span className="whitespace-nowrap">{startTimeLabel}（台灣時間）</span>，請大家提前進場。
                    </>
                  ) : null}
                  進來聊天預測支持誰的歌最熱血最動人，<span className="whitespace-nowrap">或是你來挑戰？</span>{" "}
                  <span className="whitespace-nowrap">Show me what you got!!!</span>
                </>
              )
            : "這場 Battle 已經成立，進場後依照音樂感動投票。"}
        </p>
        <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-[1.15fr_1.15fr_0.78fr]">
          {isResultInvite ? (
            <>
              <Link
                href={href}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.28)] transition hover:bg-orange-300 sm:col-span-2"
              >
                查看戰果
              </Link>
              <Link
                href={`/battle?lang=${lang}`}
                className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100"
              >
                去鬥歌場
              </Link>
            </>
          ) : isHookCard ? (
            <>
              {isHookExpired ? (
                <span className="rounded-full border border-orange-300/25 bg-orange-500/10 px-6 py-3 text-sm font-black text-orange-100">
                  戰帖已過期
                </span>
              ) : isHookAccepted || !canAcceptHook ? (
                <span className="rounded-full border border-orange-300/25 bg-orange-500/10 px-6 py-3 text-sm font-black text-orange-100">
                  已經被人挑戰了
                </span>
              ) : (
                <Link
                  href={acceptHref}
                  className="rounded-full bg-orange-500 px-6 py-5 text-xl font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.28)] transition hover:bg-orange-300"
                >
                  我要接受挑戰
                </Link>
              )}
              <Link
                href={isHookExpired ? `/battle?lang=${lang}` : spectateHref}
                className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-5 text-xl font-black text-cyan-50 transition hover:border-cyan-100"
              >
                {isHookExpired ? "回鬥歌場" : "我要觀戰"}
              </Link>
              <Link
                href={`/listen-bar?lang=${lang}`}
                className="self-center rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black text-zinc-200 transition hover:border-orange-200/50"
              >
                離開
              </Link>
            </>
          ) : (
            <>
              <Link
                href={href}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.28)] transition hover:bg-orange-300 sm:col-span-2"
              >
                進入鬥歌場
              </Link>
              <Link
                href={`/listen-bar?lang=${lang}`}
                className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100"
              >
                去傷心酒吧
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
