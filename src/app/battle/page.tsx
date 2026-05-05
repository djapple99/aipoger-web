"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";

const seedComments = [
  "A 隊節奏很穩，這段 drop 很強。",
  "B 隊聲線層次比較有記憶點！",
  "副歌一出直接燃起來了。",
];

type DeckKey = "A" | "B";

type DeckInfo = {
  fighterName: string;
  songName: string;
  audioPath: string | null;
};

type BattleViewData = {
  id: string;
  deckA: DeckInfo;
  deckB: DeckInfo;
};

const mockBattleData: BattleViewData = {
  id: "mock-battle",
  deckA: {
    fighterName: "夜色迴響",
    songName: "Neon Dust",
    audioPath: null,
  },
  deckB: {
    fighterName: "蒼藍頻段",
    songName: "Cold Pulse",
    audioPath: null,
  },
};

function Turntable({
  label,
  deckKey,
  fighterName,
  songName,
  isActive,
  isForfeited,
  canPlay,
  onPlay,
}: {
  label: string;
  deckKey: DeckKey;
  fighterName: string;
  songName: string;
  isActive: boolean;
  isForfeited: boolean;
  canPlay: boolean;
  onPlay: (key: DeckKey) => void;
}) {
  return (
    <article className="flex flex-col items-center gap-4">
      <div
        className={`relative aspect-square w-full max-w-[280px] rounded-full border border-[#6a6d70] bg-gradient-to-br from-[#3a3e42] via-[#2a2d31] to-[#1e2024] p-4 shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),inset_0_-8px_18px_rgba(0,0,0,0.45),0_16px_35px_rgba(0,0,0,0.45)] md:max-w-[360px] ${
          isActive ? "animate-[spin_4.5s_linear_infinite]" : ""
        }`}
      >
        <div
          className={`absolute inset-6 rounded-full border border-[#71757a] bg-gradient-to-br from-[#4f555b] via-[#32363b] to-[#26292e] shadow-[inset_0_4px_10px_rgba(255,255,255,0.08),inset_0_-10px_20px_rgba(0,0,0,0.35)] ${
            !isActive ? "opacity-80" : ""
          }`}
        />
        <div className="absolute inset-[31%] rounded-full border border-[#7f8489] bg-[#565a60] shadow-[inset_0_3px_8px_rgba(0,0,0,0.35)]" />
        <div className="absolute inset-[44%] rounded-full border border-[#9aa0a6] bg-[#d6c8be]/30" />

        <button
          type="button"
          onClick={() => onPlay(deckKey)}
          disabled={!canPlay}
          className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold tracking-[0.08em] transition ${
            isForfeited
              ? "cursor-not-allowed border-[#5e6368] bg-[#3f4449] text-[#b7b0ab]"
              : "border-[#ff9e67] bg-[#4a4f55] text-[#ffe4d1] hover:shadow-[0_0_16px_rgba(255,121,40,0.45)]"
          }`}
        >
          {isForfeited ? "棄權" : "PLAY"}
        </button>
      </div>
      <div className="text-center">
        <p className="text-sm tracking-[0.32em] text-[#b1a59f]">{label}</p>
        <p className="mt-2 text-base font-semibold tracking-[0.06em] text-[#f0ebe7]">{fighterName}</p>
        <p className="mt-1 text-sm text-[#c6bbb5]">{songName}</p>
        <p className={`mt-1 text-xs tracking-[0.12em] ${isActive ? "text-[#ffb889]" : "text-[#9b938e]"}`}>
          {isActive ? "播放中" : "待機中"}
        </p>
      </div>
    </article>
  );
}

function VoteButton({ team }: { team: "A" | "B" }) {
  return (
    <button
      type="button"
      className="group w-full rounded-2xl border border-[#73777d] bg-gradient-to-b from-[#686d73] via-[#50545a] to-[#3f4349] px-5 py-4 text-base font-semibold tracking-[0.18em] text-[#f0ebe8] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-6px_12px_rgba(0,0,0,0.35),0_8px_16px_rgba(0,0,0,0.3)] transition duration-300 hover:border-[#ff8d40] hover:text-[#ffd8bf] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-6px_12px_rgba(0,0,0,0.35),0_0_18px_rgba(255,121,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a28]"
    >
      投票給 {team} 隊
    </button>
  );
}

// ─── 主要邏輯元件（useSearchParams 在這裡呼叫）───────────────────────────────

function BattleContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // ← 必須在 Suspense 內部的元件才能呼叫
  const [comments, setComments] = useState(seedComments);
  const [message, setMessage] = useState("");
  const [battleData, setBattleData] = useState<BattleViewData>(mockBattleData);
  const [activeDeck, setActiveDeck] = useState<DeckKey | null>(null);
  const [forfeitedDecks, setForfeitedDecks] = useState<Record<DeckKey, boolean>>({ A: false, B: false });
  const [firstAttack, setFirstAttack] = useState<DeckKey>("A");
  const [audioUrls, setAudioUrls] = useState<Record<DeckKey, string | null>>({ A: null, B: null });
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const matchId = searchParams.get("matchId");

  const canPlayMap = useMemo(
    () => ({
      A: !forfeitedDecks.A,
      B: !forfeitedDecks.B,
    }),
    [forfeitedDecks],
  );

  useEffect(() => {
    if (isAuthBypassEnabled) return;

    const ensureSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth?intent=watch");
      }
    };

    ensureSession();
  }, [router]);

  useEffect(() => {
    setFirstAttack(Math.random() >= 0.5 ? "A" : "B");
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBattleData = async () => {
      if (!matchId || matchId.startsWith("mock-") || isAuthBypassEnabled) {
        return;
      }

      const { data, error } = await supabase
        .from("battles")
        .select(
          "id, fighter_a_name, song_a_name, audio_a_path, fighter_b_name, song_b_name, audio_b_path",
        )
        .eq("id", matchId)
        .single<{
          id: string;
          fighter_a_name: string | null;
          song_a_name: string | null;
          audio_a_path: string | null;
          fighter_b_name: string | null;
          song_b_name: string | null;
          audio_b_path: string | null;
        }>();

      if (!isMounted || error || !data) return;

      setBattleData({
        id: data.id,
        deckA: {
          fighterName: data.fighter_a_name ?? "A 隊鬥士",
          songName: data.song_a_name ?? "Deck A Track",
          audioPath: data.audio_a_path,
        },
        deckB: {
          fighterName: data.fighter_b_name ?? "B 隊鬥士",
          songName: data.song_b_name ?? "Deck B Track",
          audioPath: data.audio_b_path,
        },
      });
    };

    fetchBattleData();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    let mounted = true;

    const resolveAudioUrls = async () => {
      const nextUrls: Record<DeckKey, string | null> = { A: null, B: null };

      const entries: Array<[DeckKey, string | null]> = [
        ["A", battleData.deckA.audioPath],
        ["B", battleData.deckB.audioPath],
      ];

      for (const [key, path] of entries) {
        if (!path || path.startsWith("mock-")) continue;
        const { data } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60);
        nextUrls[key] = data?.signedUrl ?? null;
      }

      if (!mounted) return;
      setAudioUrls(nextUrls);
    };

    resolveAudioUrls();

    return () => {
      mounted = false;
    };
  }, [battleData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setForfeitedDecks((prev) => ({
        A: prev.A || activeDeck !== "A",
        B: prev.B || activeDeck !== "B",
      }));
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [activeDeck]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setComments((prev) => [trimmed, ...prev].slice(0, 20));
    setMessage("");
  };

  const pauseAll = () => {
    audioARef.current?.pause();
    audioBRef.current?.pause();
  };

  const handlePlay = (deck: DeckKey) => {
    if (!canPlayMap[deck]) return;

    const targetAudio = deck === "A" ? audioARef.current : audioBRef.current;
    pauseAll();
    setActiveDeck(deck);

    if (targetAudio?.src) {
      targetAudio.currentTime = 0;
      targetAudio.play().catch(() => {
        setComments((prev) => [`${deck} 隊音訊播放失敗，請稍後再試。`, ...prev].slice(0, 20));
      });
    } else {
      setComments((prev) => [`${deck} 隊已觸發 PLAY（目前使用模擬音訊）。`, ...prev].slice(0, 20));
    }
  };

  return (
    <main className="min-h-screen bg-[#1b1d20] text-[#ece9e6]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-5 pt-6 sm:px-6 md:px-10 md:pb-8">
        <header className="mb-5 flex items-center justify-between border-b border-[#4f5358] pb-4">
          <div>
            <p className="text-xs tracking-[0.4em] text-[#8e847f]">AIPOGER</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[0.2em] text-[#f2efec] md:text-3xl">鬥歌場</h1>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-[#5d6268] px-4 py-2 text-sm tracking-[0.12em] text-[#d8d3cf] transition hover:border-[#ff8d40] hover:text-[#ffd8bf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a28]"
          >
            返回首頁
          </Link>
        </header>

        <div className="mb-4 rounded-xl border border-[#4f5358] bg-[#25292d] px-4 py-3 text-sm tracking-[0.12em] text-[#f0e6df]">
          先攻判定：<span className="font-semibold text-[#ffbf99]">{firstAttack} 隊先攻</span>
        </div>

        <section className="grid flex-1 grid-rows-[auto_auto_1fr] gap-6 md:grid-cols-2 md:grid-rows-[auto_auto]">
          <div className="rounded-3xl border border-[#4d5257] bg-[#24272b]/80 px-4 py-6 md:px-7">
            <Turntable
              label="SONG DECK A"
              deckKey="A"
              fighterName={battleData.deckA.fighterName}
              songName={battleData.deckA.songName}
              isActive={activeDeck === "A"}
              isForfeited={forfeitedDecks.A}
              canPlay={canPlayMap.A}
              onPlay={handlePlay}
            />
          </div>
          <div className="rounded-3xl border border-[#4d5257] bg-[#24272b]/80 px-4 py-6 md:px-7">
            <Turntable
              label="SONG DECK B"
              deckKey="B"
              fighterName={battleData.deckB.fighterName}
              songName={battleData.deckB.songName}
              isActive={activeDeck === "B"}
              isForfeited={forfeitedDecks.B}
              canPlay={canPlayMap.B}
              onPlay={handlePlay}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-2 md:gap-4">
            <VoteButton team="A" />
            <VoteButton team="B" />
          </div>

          <section className="flex min-h-[230px] flex-col rounded-2xl border border-[#4d5257] bg-[#23262a] p-4 md:col-span-2 md:min-h-[260px] md:p-5">
            <h2 className="text-sm font-medium tracking-[0.2em] text-[#baa9a0]">彈幕牆</h2>
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto rounded-xl border border-[#3f4348] bg-[#1c1f22] p-3">
              {comments.map((comment, index) => (
                <p
                  key={`${comment}-${index}`}
                  className="rounded-lg border border-[#3e4247] bg-[#2a2e33] px-3 py-2 text-sm text-[#ddd7d2]"
                >
                  {comment}
                </p>
              ))}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={handleSend}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="輸入你的彈幕留言..."
                className="h-11 flex-1 rounded-xl border border-[#5f646a] bg-[#2a2e33] px-4 text-sm text-[#f2efec] placeholder:text-[#9b938e] focus:outline-none focus:ring-2 focus:ring-[#ff7a28]"
              />
              <button
                type="submit"
                className="rounded-xl border border-[#767c82] bg-gradient-to-b from-[#646a70] to-[#4a4f55] px-4 text-sm font-medium tracking-[0.1em] text-[#f4efeb] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a28]"
              >
                發送
              </button>
            </form>
          </section>
        </section>

        <audio
          ref={audioARef}
          src={audioUrls.A ?? undefined}
          onEnded={() => setActiveDeck((prev) => (prev === "A" ? null : prev))}
        />
        <audio
          ref={audioBRef}
          src={audioUrls.B ?? undefined}
          onEnded={() => setActiveDeck((prev) => (prev === "B" ? null : prev))}
        />
      </div>
    </main>
  );
}

// ─── Page export（只負責 Suspense 包裝）─────────────────────────────────────

export default function BattlePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1b1d20] flex items-center justify-center text-[#ff8d40] text-sm tracking-[0.2em]">
          載入中...
        </div>
      }
    >
      <BattleContent />
    </Suspense>
  );
}

import { Suspense } from "react";

// 如果 BattleContent 或下層元件有用到 useSearchParams，則需繞一層
function BattleContentWithSuspense() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BattleContent />
    </Suspense>
  );
}

export default function BattlePage() {
  return <BattleContentWithSuspense />;
}