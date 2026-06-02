"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SafetyNotice from "@/components/safety-notice";
import ShareButton from "@/components/share-button";
import { supabase } from "@/lib/supabase";
import { getFreshSession } from "@/lib/auth-session";
import { useI18n } from "@/lib/i18n";

type DailySide = "A" | "B";

type DailyEntry = {
  id: string;
  user_id?: string | null;
  title: string;
  genre?: string | null;
  ai_tool?: string | null;
  audio_path?: string | null;
  cover_url?: string | null;
  avatar_url?: string | null;
};

type DailyBattleRow = {
  id: string;
  status?: string | null;
  ends_at?: string | null;
  winner_entry_id?: string | null;
  entry_a?: DailyEntry | DailyEntry[] | null;
  entry_b?: DailyEntry | DailyEntry[] | null;
};

type LoadedBattle = {
  id: string;
  status: string;
  endsAt: string | null;
  winnerEntryId: string | null;
  A: DailyEntry;
  B: DailyEntry;
};

const demoEntryA: DailyEntry = {
  id: "demo-a",
  title: "Neon Dust",
  genre: "流行舞曲",
  ai_tool: "Suno",
  audio_path: "/music/home-bgm.mp3",
  cover_url: "/aipoger-brand-logo-transparent-20260522.png",
};

const demoEntryB: DailyEntry = {
  id: "demo-b",
  title: "Cold Pulse",
  genre: "動感電音",
  ai_tool: "Udio",
  audio_path: "/music/home-bgm.mp3",
  cover_url: "/aipoger-brand-logo-transparent-20260522.png",
};

function firstEntry(value: DailyEntry | DailyEntry[] | null | undefined): DailyEntry | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isDirectAudio(path: string) {
  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/") || path.startsWith("blob:");
}

function BattleSideCard({
  side,
  entry,
  audioUrl,
  active,
  audioRef,
  onPlay,
}: {
  side: DailySide;
  entry: DailyEntry;
  audioUrl: string | null;
  active: boolean;
  audioRef: (node: HTMLAudioElement | null) => void;
  onPlay: (side: DailySide) => void;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[1.7rem] border p-4 shadow-[0_28px_90px_rgba(0,0,0,0.42)] ${
      side === "A" ? "border-orange-300/28 bg-orange-500/[0.07]" : "border-cyan-200/24 bg-cyan-300/[0.06]"
    }`}>
      <div className="pointer-events-none absolute inset-0 opacity-75 [background:radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.58))]" />
      <div className="relative z-10 grid gap-5 md:grid-cols-[14rem_1fr] md:items-center">
        <div className="mx-auto flex aspect-square w-full max-w-[15rem] items-center justify-center rounded-full border border-white/10 bg-black shadow-[inset_0_0_70px_rgba(255,255,255,0.05),0_0_46px_rgba(255,106,0,0.08)]">
          <div className="relative h-[62%] w-[62%] overflow-hidden rounded-full border border-white/12 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.cover_url?.trim() || "/aipoger-brand-logo-transparent-20260522.png"}
              alt={entry.title}
              className={`h-full w-full object-cover ${active ? "animate-[spin_10s_linear_infinite]" : ""}`}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-[45%] rounded-full bg-black ring-1 ring-white/20" />
          </div>
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.34em] ${side === "A" ? "text-orange-200/80" : "text-cyan-100/80"}`}>
            SIDE {side} · FULL TRACK
          </p>
          <h2 className="mt-3 break-words text-4xl font-black leading-none text-white md:text-5xl">{entry.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full border border-white/12 bg-black/36 px-3 py-1.5 text-zinc-200">{entry.genre || "Genre"}</span>
            <span className="rounded-full border border-white/12 bg-black/36 px-3 py-1.5 text-zinc-200">{entry.ai_tool || "AI Tool"}</span>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/45 p-3">
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={audioUrl ?? undefined}
              onPlay={() => onPlay(side)}
              className="w-full accent-orange-500"
            />
            <p className="mt-2 text-xs font-bold leading-5 text-zinc-500">
              你可以自己拖進度、重聽、暫停。聽到感覺再投票。
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DailyBattleRoomPage() {
  const params = useParams<{ id: string }>();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const battleId = params.id;
  const [battle, setBattle] = useState<LoadedBattle>({
    id: "demo-daily",
    status: "live",
    endsAt: null,
    winnerEntryId: null,
    A: demoEntryA,
    B: demoEntryB,
  });
  const [audioUrls, setAudioUrls] = useState<Record<DailySide, string | null>>({ A: demoEntryA.audio_path ?? null, B: demoEntryB.audio_path ?? null });
  const [voteCounts, setVoteCounts] = useState<Record<DailySide, number>>({ A: 0, B: 0 });
  const [activeSide, setActiveSide] = useState<DailySide | null>(null);
  const [pickedSide, setPickedSide] = useState<DailySide | null>(null);
  const [comment, setComment] = useState("");
  const [voteMessage, setVoteMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const audioRefs = useRef<Record<DailySide, HTMLAudioElement | null>>({ A: null, B: null });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!battleId || battleId.startsWith("mock") || battleId.startsWith("demo")) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("daily_battles")
        .select(`
          id,
          status,
          ends_at,
          winner_entry_id,
          entry_a:daily_battle_entries!daily_battles_entry_a_id_fkey(id,user_id,title,genre,ai_tool,audio_path,cover_url,avatar_url),
          entry_b:daily_battle_entries!daily_battles_entry_b_id_fkey(id,user_id,title,genre,ai_tool,audio_path,cover_url,avatar_url)
        `)
        .eq("id", battleId)
        .maybeSingle<DailyBattleRow>();

      if (!mounted) return;
      if (!error && data) {
        const entryA = firstEntry(data.entry_a);
        const entryB = firstEntry(data.entry_b);
        if (entryA && entryB) {
          setBattle({
            id: data.id,
            status: data.status || "live",
            endsAt: data.ends_at ?? null,
            winnerEntryId: data.winner_entry_id ?? null,
            A: entryA,
            B: entryB,
          });
        }
      }
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [battleId]);

  useEffect(() => {
    let mounted = true;
    const loadVotes = async () => {
      if (!battle.id || battle.id.startsWith("demo")) return;
      const { data, error } = await supabase
        .from("daily_battle_votes")
        .select("picked_entry_id")
        .eq("battle_id", battle.id);
      if (!mounted || error) return;
      const votes = (data ?? []) as Array<{ picked_entry_id?: string | null }>;
      setVoteCounts({
        A: votes.filter((vote) => vote.picked_entry_id === battle.A.id).length,
        B: votes.filter((vote) => vote.picked_entry_id === battle.B.id).length,
      });
    };
    void loadVotes();
    return () => {
      mounted = false;
    };
  }, [battle.A.id, battle.B.id, battle.id]);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      const next: Record<DailySide, string | null> = { A: null, B: null };
      for (const side of ["A", "B"] as const) {
        const path = battle[side].audio_path?.trim();
        if (!path) continue;
        if (isDirectAudio(path)) {
          next[side] = path;
          continue;
        }
        const { data } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60);
        next[side] = data?.signedUrl ?? null;
      }
      if (mounted) setAudioUrls(next);
    };
    void resolve();
    return () => {
      mounted = false;
    };
  }, [battle]);

  const timeLeftLabel = useMemo(() => {
    if (battle.status === "finished") return isZh ? "已結束" : "Finished";
    if (battle.status === "cancelled") return isZh ? "已取消" : "Cancelled";
    if (!battle.endsAt) return isZh ? "24H 開放中" : "24H open";
    const ms = new Date(battle.endsAt).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return isZh ? "結算中" : "Settling";
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
  }, [battle.endsAt, battle.status, isZh]);

  const isFinished = battle.status === "finished";
  const isClosed = isFinished || battle.status === "cancelled" || timeLeftLabel === (isZh ? "結算中" : "Settling");
  const winnerSide: DailySide | null =
    battle.winnerEntryId === battle.A.id ? "A" : battle.winnerEntryId === battle.B.id ? "B" : null;

  const handlePlay = (side: DailySide) => {
    setActiveSide(side);
    const otherSide = side === "A" ? "B" : "A";
    audioRefs.current[otherSide]?.pause();
  };

  const handleVote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pickedSide) {
      setVoteMessage(isZh ? "先選 A Side 或 B Side。" : "Pick A Side or B Side first.");
      return;
    }
    const cleanComment = comment.trim();
    if (cleanComment.length < 2) {
      setVoteMessage(isZh ? "請留下至少一句觀眾評價。" : "Leave at least one listener comment.");
      return;
    }

    setSubmitting(true);
    setVoteMessage("");
    try {
      const session = await getFreshSession();
      if (!session?.user) {
        setVoteMessage(isZh ? "請先登入後再投票。" : "Sign in before voting.");
        return;
      }
      const pickedEntry = pickedSide === "A" ? battle.A.id : battle.B.id;
      const { error } = await supabase.from("daily_battle_votes").upsert(
        {
          battle_id: battle.id,
          user_id: session.user.id,
          picked_entry_id: pickedEntry,
          comment: cleanComment,
        },
        { onConflict: "battle_id,user_id" },
      );
      if (error) throw error;
      setVoteMessage(isZh ? "投票已送出，24H 後一起看結果。" : "Vote submitted. Results unlock after 24h.");
    } catch (error) {
      console.error("[daily battle vote]", error);
      setVoteMessage(isZh ? "投票失敗，請稍後再試。" : "Vote failed. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_10%,rgba(255,106,0,0.24),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(0,203,255,0.16),transparent_28%),linear-gradient(180deg,#050505,#090604)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="mb-6 rounded-[1.7rem] border border-white/10 bg-black/62 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.42em] text-orange-300/80">24H DAILY BATTLE</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                {isZh ? "整首作品對決" : "Full Track Battle"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-zinc-400">
                {isZh ? "不用搶秒數。A Side / B Side 兩首都能自由播放、拖進度、慢慢聽。投票前請留下真正的觀眾評價。" : "No rush. Control A Side / B Side, scrub, replay, and vote only after leaving a real listener comment."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-4 py-2 text-sm font-black text-yellow-100">{timeLeftLabel}</span>
              <ShareButton
                title={isZh ? "AIPOGER 24H Daily Battle" : "AIPOGER 24H Daily Battle"}
                text={isZh ? `${battle.A.title} vs ${battle.B.title}，進來慢慢聽再投票。` : `${battle.A.title} vs ${battle.B.title}. Listen slowly, then vote.`}
                label={isZh ? "分享這場" : "Share"}
                copiedLabel={isZh ? "已複製" : "Copied"}
              />
              <Link href="/battle" className="rounded-full border border-white/12 bg-white/[0.055] px-4 py-2 text-sm font-black text-zinc-200 transition hover:border-orange-300/50 hover:text-white">
                {isZh ? "回鬥歌場" : "Back"}
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[1.5rem] border border-orange-300/20 bg-orange-500/10 px-5 py-8 text-center text-sm font-black tracking-[0.22em] text-orange-200">
            AIPOGER LOADING
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <BattleSideCard
                side="A"
                entry={battle.A}
                audioUrl={audioUrls.A}
                active={activeSide === "A"}
                audioRef={(node) => {
                  audioRefs.current.A = node;
                }}
                onPlay={handlePlay}
              />
              <BattleSideCard
                side="B"
                entry={battle.B}
                audioUrl={audioUrls.B}
                active={activeSide === "B"}
                audioRef={(node) => {
                  audioRefs.current.B = node;
                }}
                onPlay={handlePlay}
              />
            </section>

            <section className="mt-5 rounded-[1.7rem] border border-white/10 bg-black/66 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur">
              {isClosed ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.32em] text-yellow-100/80">24H RESULT</p>
                    <h2 className="mt-2 text-3xl font-black text-white">
                      {battle.status === "cancelled"
                        ? isZh
                          ? "這場已取消"
                          : "Battle cancelled"
                        : winnerSide
                          ? isZh
                            ? `${winnerSide} Side 勝出`
                            : `${winnerSide} Side wins`
                          : isZh
                            ? "平手收場"
                            : "Tie"}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-zinc-400">
                      A Side {voteCounts.A} · B Side {voteCounts.B}
                    </p>
                  </div>
                  <Link href={`/battle?lang=${lang}`} className="rounded-full bg-yellow-300 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-yellow-100">
                    {isZh ? "回鬥歌場" : "Back to Battle"}
                  </Link>
                </div>
              ) : (
                <>
                  <SafetyNotice kind="chat" compact className="mb-4" />
                  <form onSubmit={handleVote} className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                    <div className="grid grid-cols-2 gap-2">
                      {(["A", "B"] as const).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setPickedSide(side)}
                          className={`rounded-2xl border px-5 py-4 text-sm font-black transition ${
                            pickedSide === side
                              ? "border-orange-200 bg-orange-500 text-black shadow-[0_0_26px_rgba(255,106,0,0.24)]"
                              : "border-white/10 bg-white/[0.045] text-zinc-200 hover:border-orange-300/45"
                          }`}
                        >
                          {side === "A" ? "A SIDE" : "B SIDE"}
                        </button>
                      ))}
                    </div>
                    <input
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder={isZh ? "留下觀眾評價後投票，例如：副歌記憶點更強" : "Leave a listener comment before voting"}
                      maxLength={240}
                      className="h-14 rounded-2xl border border-white/10 bg-black/58 px-5 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-orange-500 px-8 text-sm font-black tracking-[0.12em] text-black transition hover:bg-orange-300 disabled:opacity-55"
                    >
                      {submitting ? (isZh ? "送出中" : "Sending") : (isZh ? "投票" : "Vote")}
                    </button>
                  </form>
                </>
              )}
              {voteMessage ? <p className="mt-3 text-sm font-black text-orange-200">{voteMessage}</p> : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
