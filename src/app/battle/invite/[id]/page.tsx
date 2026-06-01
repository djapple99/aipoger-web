import type { Metadata } from "next";
import Link from "next/link";
import { getBattleOgData, siteOrigin } from "@/lib/battle-og";

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

async function inviteData(id: string, searchParams: InviteSearchParams) {
  const battle = await getBattleOgData(id);
  const isHookCard = firstParam(searchParams, "type") === "hook-card";
  return {
    genre: cleanParam(firstParam(searchParams, "g"), battle.genre || "AI Music Drop Battle"),
    leftName: cleanParam(firstParam(searchParams, "l"), battle.fighter_a_name),
    rightName: cleanParam(firstParam(searchParams, "r"), isHookCard ? "等待挑戰者" : battle.fighter_b_name),
    leftSong: cleanParam(firstParam(searchParams, "ls"), battle.song_a_name),
    rightSong: cleanParam(firstParam(searchParams, "rs"), isHookCard ? "你的 45s Drop" : battle.song_b_name),
    leftCover: cleanParam(firstParam(searchParams, "lc"), battle.song_a_cover || ""),
    rightCover: cleanParam(firstParam(searchParams, "rc"), battle.song_b_cover || ""),
    leftAvatar: cleanParam(firstParam(searchParams, "la"), battle.fighter_a_avatar || ""),
    rightAvatar: cleanParam(firstParam(searchParams, "ra"), battle.fighter_b_avatar || ""),
    leftTool: cleanParam(firstParam(searchParams, "ta") || firstParam(searchParams, "tool"), battle.ai_tool_a || "AI Music"),
    rightTool: cleanParam(firstParam(searchParams, "tb"), isHookCard ? "等待接戰工具" : battle.ai_tool_b || "AI Music"),
    battleType: cleanParam(firstParam(searchParams, "bt"), isHookCard ? "90s Drop Battle 等待卡" : "90s Drop Battle"),
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
  const title = `AIPOGER 90S 最強抓波Drop Battle 戰帖｜${data.leftName} VS ${data.rightName}`;
  const description = `${data.battleType}｜${data.leftName}《${data.leftSong}》(${data.leftTool}) VS ${data.rightName}《${data.rightSong}》(${data.rightTool})｜開打前集結。`;

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
  const challengeParams = new URLSearchParams({
    battleMode: "instant",
    challengeEntryId: id,
    genre: data.genre,
    lang,
  });
  const watchParams = new URLSearchParams({ lang, focusQueue: id });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 text-white">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_14%,rgba(255,106,0,0.24),transparent_34%),radial-gradient(circle_at_82%_20%,rgba(0,203,255,0.14),transparent_30%),linear-gradient(180deg,#050505,#0b0908)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <section className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-orange-300/35 bg-[radial-gradient(circle_at_20%_10%,rgba(255,106,0,0.24),transparent_34%),linear-gradient(180deg,#100704,#030303)] p-7 text-center shadow-[0_0_80px_rgba(255,106,0,0.18)]">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-200/80">
          {isResultInvite ? "AIPOGER DROP BATTLE RESULT CARD" : isHookCard ? "AIPOGER DROP BATTLE WAITING CARD" : "AIPOGER LIVE BATTLE"}
        </p>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-cyan-100/75">
          {data.battleType} · {data.genre}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          {data.leftName} <span className="text-orange-300">VS</span> {data.rightName}
        </h1>
        <p className="mt-4 text-base font-bold leading-7 text-zinc-300">
          {data.leftSong} 對上 {data.rightSong}
        </p>
        <div className="mx-auto mt-4 grid max-w-xl gap-2 text-left sm:grid-cols-2">
          <div className="rounded-2xl border border-orange-300/25 bg-orange-500/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200/70">A SIDE AI TOOL</p>
            <p className="mt-1 truncate text-sm font-black text-orange-50">{data.leftTool}</p>
          </div>
          <div className="rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">B SIDE AI TOOL</p>
            <p className="mt-1 truncate text-sm font-black text-cyan-50">{data.rightTool}</p>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
          {isResultInvite
            ? "這是一張 AIPOGER Drop Battle 戰果卡。進場查看完整結果與榮譽卡。"
            : isHookCard
            ? "這是一張公開最強抓波Drop Battle 戰帖。你可以上傳自己的 45 秒 Drop 接戰，也可以先觀戰確認狀態。"
            : "這場 Battle 已經成立，進場後依照音樂感動投票。"}
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
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
              <Link
                href={`/battle/setup?${challengeParams.toString()}`}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.28)] transition hover:bg-orange-300"
              >
                我要挑戰
              </Link>
              <Link
                href={`/battle?${watchParams.toString()}`}
                className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100"
              >
                我要觀戰
              </Link>
              <Link
                href={`/listen-bar?lang=${lang}`}
                className="rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-black text-zinc-200 transition hover:border-orange-200/50"
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
