// src/app/battle/[id]/page.tsx
"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthBypassEnabled, mockUserId } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
import { fontGlowSansBattle } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";

type SenderType = "audience" | "fighter_a" | "fighter_b";

type ChatMessage = {
  id: string;
  battle_id: string;
  user_id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
};

type BattleData = {
  id: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  audio_a_path: string | null;
  audio_b_path: string | null;
  fighter_a_avatar: string | null;
  fighter_b_avatar: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  lyrics_a: string | null;
  lyrics_b: string | null;
  status: "live" | "finished" | "cancelled";
};

type VoteCount = { fighter_a: number; fighter_b: number };

const VINYL_COVER_PLACEHOLDER = "https://picsum.photos/300";

function isHttpOrDataImageUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || /^data:image\//i.test(t) || /^blob:/i.test(t);
}

async function resolveMediaUrl(raw: string | null | undefined): Promise<string | null> {
  const t = raw?.trim();
  if (!t) return null;
  if (isHttpOrDataImageUrl(t)) return t;

  const tryBucket = async (bucket: "battle-audio" | "avatars") => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(t, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  };

  const fromAvatars = await tryBucket("avatars");
  if (fromAvatars) return fromAvatars;
  const fromAudio = await tryBucket("battle-audio");
  if (fromAudio) return fromAudio;

  console.warn("[battle media] signed url failed", t);
  return null;
}

// ─── 唱臂裝飾 ────────────────────────────────────────────
function TonearmGraphic({ accent }: { accent: "orange" | "blue" }) {
  const stroke = accent === "orange" ? "#fb923c" : "#60a5fa";
  return (
    <svg
      className="pointer-events-none absolute -right-1 top-[16%] z-10 h-[74%] w-[40%] md:-right-2"
      viewBox="0 0 48 120"
      fill="none"
      aria-hidden
    >
      <circle cx="40" cy="14" r="5" stroke={stroke} strokeWidth="2" opacity={0.85} />
      <path
        d="M40 19 Q 22 48 14 112"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={0.9}
      />
      <circle cx="12" cy="114" r="4.5" fill="#27272a" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

// ─── 旋轉唱片元件 ──────────────────────────────────────────
function VinylDisc({
  fighterName,
  songName,
  coverUrl,
  avatarUrl,
  isPlaying,
  onToggle,
  color,
  aiTool,
  accent,
}: {
  fighterName: string;
  songName: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  isPlaying: boolean;
  onToggle: () => void;
  color: string;
  aiTool: string | null;
  accent: "orange" | "blue";
}) {
  const { t } = useI18n();

  const [coverBroken, setCoverBroken] = useState(false);
  const trimmedCover = coverUrl?.trim() ?? "";
  const hasCover = Boolean(trimmedCover) && !coverBroken;
  const initialMark = [...(fighterName.trim() || "?")].slice(0, 1).join("") || "?";
  const trimmedAvatar = avatarUrl?.trim() ?? "";
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatarImg = Boolean(trimmedAvatar) && !avatarBroken;

  const avatarRing =
    accent === "orange"
      ? "border-orange-500 shadow-[0_0_24px_rgba(251,146,60,0.25)]"
      : "border-blue-400 shadow-[0_0_24px_rgba(96,165,250,0.25)]";

  const playAura =
    accent === "orange"
      ? "shadow-[0_0_40px_rgba(255,106,0,0.38)]"
      : "shadow-[0_0_40px_rgba(59,130,246,0.38)]";

  const cueDot =
    accent === "orange" ? "bg-orange-500 text-black" : "bg-blue-500 text-black";

  const playClasses =
    accent === "orange"
      ? isPlaying
        ? "border-orange-500 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
        : "border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-orange-500 hover:text-orange-400"
      : isPlaying
        ? "border-blue-400 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
        : "border-zinc-600 bg-zinc-800 text-zinc-200 hover:border-blue-400 hover:text-blue-300";

  useEffect(() => {
    setCoverBroken(false);
  }, [trimmedCover]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [trimmedAvatar]);

  useEffect(() => {
    if (!trimmedCover) return;
    const img = new window.Image();
    img.onload = () => setCoverBroken(false);
    img.onerror = () => setCoverBroken(true);
    img.src = trimmedCover;
  }, [trimmedCover]);

  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-4">
      <div className="w-full text-center leading-snug">
        <p className="text-[15px] text-white">{fighterName}</p>
        <p className="mt-1 text-sm text-zinc-200">{songName}</p>
        {aiTool ? <p className="mt-1 text-[11px] text-zinc-500">{aiTool}</p> : null}
      </div>

      <div className="relative w-full">
        <div
          className={`relative mx-auto flex h-[220px] w-[220px] items-center justify-center md:h-[280px] md:w-[280px] ${
            isPlaying ? playAura : ""
          }`}
        >
          <TonearmGraphic accent={accent} />
          <div
            className="relative flex h-full w-full cursor-pointer items-center justify-center"
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") onToggle();
            }}
            role="button"
            tabIndex={0}
            aria-label={isPlaying ? t("deck_pause_aria") : t("deck_play_aria")}
          >
            <div
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: hasCover
                  ? `linear-gradient(135deg, #111 0%, #1a1a1a 100%)`
                  : `linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #111 100%)`,
              }}
            >
              {[8, 16, 24, 32, 40, 48].map((r) => (
                <div
                  key={r}
                  className="absolute rounded-full border border-zinc-800/30"
                  style={{ inset: `${r}%` }}
                />
              ))}
              <div className="absolute inset-0 rounded-full border border-zinc-700/40" />
            </div>

            <div
              className={`absolute -left-0.5 -top-0.5 z-30 h-[3.75rem] w-[3.75rem] overflow-hidden rounded-full border-[3px] bg-zinc-900 ring-2 ring-black/70 md:h-[5rem] md:w-[5rem] ${avatarRing}`}
              aria-hidden
            >
              {showAvatarImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trimmedAvatar}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span
                  className={`flex h-full w-full items-center justify-center text-2xl md:text-3xl ${
                    accent === "orange" ? "text-orange-400" : "text-blue-400"
                  }`}
                >
                  {initialMark}
                </span>
              )}
            </div>

            {hasCover ? (
              <div
                className={`relative z-10 flex h-[55%] w-[55%] items-center justify-center overflow-hidden rounded-full ${
                  isPlaying ? "animate-spin" : ""
                }`}
                style={{
                  animationDuration: isPlaying ? "3s" : undefined,
                  animationTimingFunction: "linear",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trimmedCover}
                  alt={songName}
                  className="h-full w-full object-cover"
                  onError={() => setCoverBroken(true)}
                />
                <div className="absolute inset-[46%] rounded-full bg-zinc-900 ring-1 ring-zinc-700/80" />
                <div className="absolute inset-[49%] rounded-full bg-zinc-950" />
              </div>
            ) : (
              <div
                className={`relative z-10 flex h-[55%] w-[55%] items-center justify-center overflow-hidden rounded-full ${
                  isPlaying ? "animate-spin" : ""
                }`}
                style={{
                  background: `linear-gradient(145deg, ${color}33 0%, ${color}66 50%, ${color}22 100%)`,
                  animationDuration: isPlaying ? "3s" : undefined,
                  animationTimingFunction: "linear",
                }}
              >
                <div className="absolute inset-[42%] rounded-full border border-zinc-800 bg-zinc-900" />
                <div className="absolute inset-[46%] rounded-full bg-zinc-950" />
              </div>
            )}

            {isPlaying ? (
              <div
                className={`absolute -right-0 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-lg ${cueDot}`}
              >
                ▶
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`rounded-full border-2 px-6 py-2 text-xs tracking-[0.2em] transition-all md:text-sm ${playClasses}`}
      >
        {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
      </button>
    </div>
  );
}

function VoteHeartButton({
  selected,
  voteLocked,
  onVote,
  alignEnd,
}: {
  selected: boolean;
  voteLocked: boolean;
  onVote: () => void;
  alignEnd?: boolean;
}) {
  const { t } = useI18n();
  const notChosenOther = voteLocked && !selected;

  return (
    <button
      type="button"
      onClick={() => void onVote()}
      disabled={voteLocked}
      title={t("battle_vote_heart_aria")}
      aria-label={t("battle_vote_heart_aria")}
      aria-pressed={selected}
      className={`p-2 transition disabled:opacity-40 ${alignEnd ? "self-end" : "self-start"}`}
    >
      <svg viewBox="0 0 24 24" className="h-10 w-10 md:h-11 md:w-11">
        <path
          fill={selected ? "#ef4444" : "none"}
          stroke={selected ? "#ef4444" : notChosenOther ? "#52525b" : "#f4f4f5"}
          strokeWidth={1.6}
          d="M12 21.35l-1.05-.96C6.96 17.06 4 13.92 4 10.94 4 8.73 5.71 7 8.02 7c1.53 0 3.04.93 4 2.43.96-1.5 2.47-2.43 4-2.43C18.29 7 20 8.73 20 10.94c0 3-2.97 6.17-7.94 11.43L12 21.35z"
        />
      </svg>
    </button>
  );
}

// ─── 聊天泡泡 ──────────────────────────────────────────────
function ChatBubble({ msg, currentUserId }: { msg: ChatMessage; currentUserId: string }) {
  const isMe = msg.user_id === currentUserId;
  const isFighter = msg.sender_type !== "audience";

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isFighter
            ? "border border-yellow-500/40 bg-yellow-500/10"
            : isMe
              ? "bg-orange-600 text-white"
              : "bg-zinc-800 text-zinc-200"
        }`}
      >
        {msg.display_name && (
          <p className="mb-1 text-[10px] font-semibold tracking-wider text-zinc-400">{msg.display_name}</p>
        )}
        <p className="leading-relaxed">{msg.content}</p>
      </div>
    </div>
  );
}

// ─── 主內容（useParams 需在 Suspense 內）───────────────────

function BattleArenaContent() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = (params?.id as string) ?? "";

  // 狀態
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [votes, setVotes] = useState<VoteCount>({ fighter_a: 0, fighter_b: 0 });
  const [hasVoted, setHasVoted] = useState<"fighter_a" | "fighter_b" | null>(null);
  const [activeDeck, setActiveDeck] = useState<"A" | "B" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string>("");
  const [audioUrls, setAudioUrls] = useState<{ A: string | null; B: string | null }>({ A: null, B: null });
  const [coverDisplayA, setCoverDisplayA] = useState<string | null>(null);
  const [coverDisplayB, setCoverDisplayB] = useState<string | null>(null);
  const [avatarDisplayA, setAvatarDisplayA] = useState<string | null>(null);
  const [avatarDisplayB, setAvatarDisplayB] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);

  // Refs
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── 取得目前用戶 ──────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      if (isAuthBypassEnabled) {
        setMyUserId(mockUserId);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth?intent=battle");
        return;
      }
      setMyUserId(session.user.id);
    };
    void getUser();
  }, [router]);

  // ── 載入 Battle 資料（查詢前先 await getSession，避免 JWT 未就緒被 RLS 擋）────
  useEffect(() => {
    if (!battleId) return;

    let mounted = true;

    const loadBattle = async () => {
      if (battleId.startsWith("mock-") || isAuthBypassEnabled) {
        const qFighter = searchParams.get("fighterName")?.trim() ?? "";
        const qSong = searchParams.get("songName")?.trim() ?? "";
        const qCover = searchParams.get("coverUrl")?.trim() ?? "";
        const qAudio = searchParams.get("audioPath")?.trim() ?? "";
        const qAi = searchParams.get("aiTool")?.trim() ?? "";
        const testFlag = searchParams.get("test") === "1";

        let profileAvatar: string | null = null;
        if (!isAuthBypassEnabled) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const uid = session?.user?.id;
          if (uid) {
            const { data: prof } = await supabase
              .from("user_profiles")
              .select("avatar_url")
              .eq("id", uid)
              .maybeSingle();
            if (typeof prof?.avatar_url === "string" && prof.avatar_url.length > 0) {
              profileAvatar = prof.avatar_url;
            }
          }
        }

        setBattle({
          id: battleId,
          fighter_a_user_id: mockUserId,
          fighter_b_user_id: mockUserId,
          fighter_a_name: qFighter || (testFlag ? "測試鬥士" : "夜色迴響"),
          fighter_b_name: testFlag ? "測試對手" : "蒼藍頻段",
          song_a_name: qSong || (testFlag ? "測試歌曲" : "Neon Dust"),
          song_b_name: testFlag ? "測試歌曲B" : "Cold Pulse",
          audio_a_path: qAudio || null,
          audio_b_path: null,
          fighter_a_avatar: profileAvatar,
          fighter_b_avatar: null,
          song_a_cover: qCover || null,
          song_b_cover: null,
          ai_tool_a: qAi || "Suno",
          ai_tool_b: testFlag ? "Udio" : "Udio",
          lyrics_a: null,
          lyrics_b: null,
          status: "live",
        });
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      // 還原 session 可能略晚於首次 render，短重試避免 RLS 擋讀
      let authed = session;
      for (let i = 0; i < 6 && !authed?.user && !isAuthBypassEnabled; i++) {
        await new Promise((r) => setTimeout(r, 80));
        const { data: d2 } = await supabase.auth.getSession();
        authed = d2.session;
      }
      if (!isAuthBypassEnabled && !authed?.user && !battleId.startsWith("mock-")) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error: battleError } = await supabase
        .from("battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (!mounted) return;
      if (battleError || !data) {
        console.error("[battle load]", battleError);
        if (!data || battleError?.code === "PGRST116") {
          setError("i18n:battle_not_found");
        } else {
          setError(battleError?.message ?? "i18n:battle_load_failed");
        }
        setLoading(false);
        return;
      }

      const bdata = data as any;
      // 同步載入兩邊的 fighter_profiles（頭像 + 封面；必須取 .data）
      const [{ data: rowA }, { data: rowB }, { data: profA }, { data: profB }] = await Promise.all([
        supabase.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", bdata.fighter_a_user_id).maybeSingle(),
        supabase.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", bdata.fighter_b_user_id).maybeSingle(),
        supabase.from("user_profiles").select("avatar_url").eq("id", bdata.fighter_a_user_id).maybeSingle(),
        supabase.from("user_profiles").select("avatar_url").eq("id", bdata.fighter_b_user_id).maybeSingle(),
      ]);

      setBattle({
        ...(data as BattleData),
        fighter_a_user_id: bdata.fighter_a_user_id,
        fighter_b_user_id: bdata.fighter_b_user_id,
        fighter_a_avatar: rowA?.avatar_url ?? profA?.avatar_url ?? null,
        fighter_b_avatar: rowB?.avatar_url ?? profB?.avatar_url ?? null,
        song_a_cover: rowA?.song_cover_url ?? (bdata.song_a_cover as string | null | undefined) ?? null,
        song_b_cover: rowB?.song_cover_url ?? (bdata.song_b_cover as string | null | undefined) ?? null,
        ai_tool_a: (bdata.ai_tool_a as string | null | undefined) ?? null,
        ai_tool_b: (bdata.ai_tool_b as string | null | undefined) ?? null,
        lyrics_a: typeof bdata.lyrics_a === "string" && bdata.lyrics_a.length > 0 ? bdata.lyrics_a : null,
        lyrics_b: typeof bdata.lyrics_b === "string" && bdata.lyrics_b.length > 0 ? bdata.lyrics_b : null,
      });
      setLoading(false);
    };

    void loadBattle();
    return () => {
      mounted = false;
    };
  }, [battleId, isAuthBypassEnabled, searchParams, t]);

  // ── 封面（中心唱片貼紙）與頭像（左上角）分開解析 ────
  useEffect(() => {
    if (!battle) {
      setCoverDisplayA(null);
      setCoverDisplayB(null);
      setAvatarDisplayA(null);
      setAvatarDisplayB(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [coverA, coverB, avA, avB] = await Promise.all([
        resolveMediaUrl(battle.song_a_cover),
        resolveMediaUrl(battle.song_b_cover),
        resolveMediaUrl(battle.fighter_a_avatar),
        resolveMediaUrl(battle.fighter_b_avatar),
      ]);
      if (!cancelled) {
        setCoverDisplayA(coverA);
        setCoverDisplayB(coverB);
        setAvatarDisplayA(avA);
        setAvatarDisplayB(avB);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    battle?.song_a_cover,
    battle?.song_b_cover,
    battle?.fighter_a_avatar,
    battle?.fighter_b_avatar,
  ]);

  // ── Storage signed URL（雙方音檔；RLS 需允許讀取 battle 引用路徑）────
  useEffect(() => {
    if (!battle) return;

    const queryAudio = searchParams.get("audioPath")?.trim() ?? "";
    const mockOrBypass = battleId.startsWith("mock-") || isAuthBypassEnabled;
    const testFlag = searchParams.get("test") === "1";
    const signAudioFromQuery = Boolean(queryAudio && (testFlag || mockOrBypass));

    if (signAudioFromQuery) {
      let cancelled = false;
      void (async () => {
        const { data: signed, error } = await supabase.storage
          .from("battle-audio")
          .createSignedUrl(queryAudio, 60 * 60);
        if (!cancelled) {
          if (error) console.error("[battle audio test]", error);
          else setAudioUrls({ A: signed?.signedUrl ?? null, B: null });
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (mockOrBypass && !queryAudio) {
      setAudioUrls({ A: null, B: null });
      return;
    }

    let cancelled = false;

    const resolveUrls = async () => {
      const next: { A: string | null; B: string | null } = { A: null, B: null };
      const paths: Array<["A" | "B", string | null]> = [
        ["A", battle.audio_a_path],
        ["B", battle.audio_b_path],
      ];

      for (const [deck, path] of paths) {
        if (!path || path.startsWith("mock-")) continue;
        const { data: signed, error: signErr } = await supabase.storage
          .from("battle-audio")
          .createSignedUrl(path, 60 * 60);
        if (signErr) {
          console.error(`[battle audio ${deck}]`, signErr, path);
          continue;
        }
        next[deck] = signed?.signedUrl ?? null;
      }

      if (!cancelled) setAudioUrls(next);
    };

    void resolveUrls();
    return () => {
      cancelled = true;
    };
  }, [battle, battleId, searchParams, isAuthBypassEnabled]);

  // ── 即時觀戰人數（Presence）────────────────────────────
  useEffect(() => {
    if (!battleId || loading || isAuthBypassEnabled || !myUserId || battleId.startsWith("mock-")) return;

    const channel = supabase.channel(`presence-battle-${battleId}`, {
      config: { presence: { key: myUserId } },
    });

    const countFromState = () => {
      const state = channel.presenceState();
      const users = new Set<string>();
      for (const presences of Object.values(state)) {
        for (const p of presences as { user_id?: string }[]) {
          if (p?.user_id) users.add(p.user_id);
        }
      }
      setViewerCount(Math.max(1, users.size));
    };

    channel.on("presence", { event: "sync" }, countFromState);

    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: myUserId, at: Date.now() });
        countFromState();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battleId, loading, myUserId]);

  useEffect(() => {
    if (!battleId || loading) return;

    const channel = supabase
      .channel(`battle-chat-${battleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `battle_id=eq.${battleId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          // 取 display_name
          if (msg.user_id) {
            const { data: profile } = await supabase
              .from("fighter_profiles")
              .select("display_name, avatar_url")
              .eq("id", msg.user_id)
              .maybeSingle();
            if (profile) {
              msg.display_name = profile.display_name ?? undefined;
              msg.avatar_url = profile.avatar_url ?? undefined;
            }
          }
          setMessages((prev) => [...prev.slice(-49), msg]);
        },
      )
      .subscribe();

    // 載入歷史訊息
    const loadMessages = async () => {
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*, fighter_profiles(display_name, avatar_url)")
        .eq("battle_id", battleId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (msgs) {
        const enriched = msgs.map((m: ChatMessage & { fighter_profiles?: { display_name: string } }) => ({
          ...m,
          display_name: (m as ChatMessage & { fighter_profiles?: { display_name: string } }).fighter_profiles?.display_name,
        }));
        setMessages(enriched);
      }
    };

    void loadMessages();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battleId, loading]);

  // ── 投票訂閱 ──────────────────────────────────────────
  useEffect(() => {
    if (!battleId || loading) return;

    const loadVotes = async () => {
      const { data: voteData } = await supabase
        .from("battle_votes")
        .select("voted_for, user_id")
        .eq("battle_id", battleId);

      if (voteData) {
        setVotes({
          fighter_a: voteData.filter((v) => v.voted_for === "fighter_a").length,
          fighter_b: voteData.filter((v) => v.voted_for === "fighter_b").length,
        });
        const myVote = voteData.find((v) => v.user_id === myUserId);
        if (myVote) setHasVoted(myVote.voted_for as "fighter_a" | "fighter_b");
      }
    };

    void loadVotes();

    const channel = supabase
      .channel(`battle-votes-${battleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "battle_votes", filter: `battle_id=eq.${battleId}` },
        (payload) => {
          const v = payload.new as { voted_for: string };
          setVotes((prev) => ({
            ...prev,
            [v.voted_for]: prev[v.voted_for as keyof VoteCount] + 1,
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battleId, loading, myUserId]);

  // ── 自動滾動到最新訊息 ───────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 播放控制 ──────────────────────────────────────────
  const handleToggleDeck = useCallback(
    (deck: "A" | "B") => {
      const other = deck === "A" ? audioBRef.current : audioARef.current;
      other?.pause();

      if (activeDeck === deck) {
        // 同一張就 toggle
        const current = deck === "A" ? audioARef.current : audioBRef.current;
        if (current?.paused) {
          current.play().catch(() => {});
        } else {
          current?.pause();
        }
        setActiveDeck(current?.paused ? null : deck);
      } else {
        const target = deck === "A" ? audioARef.current : audioBRef.current;
        if (target?.src) {
          target.currentTime = 0;
          target.play().catch(() => {});
        }
        setActiveDeck(deck);
      }
    },
    [activeDeck],
  );

  // ── 發送訊息 ──────────────────────────────────────────
  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed || !battleId) return;

    const senderType: SenderType =
      myUserId === battle?.fighter_a_user_id
        ? "fighter_a"
        : myUserId === battle?.fighter_b_user_id
          ? "fighter_b"
          : "audience";

    setChatInput("");

    if (battleId.startsWith("mock-") || isAuthBypassEnabled) {
      setMessages((prev) => [
        ...prev.slice(-49),
        {
          id: `mock-${Date.now()}`,
          battle_id: battleId,
          user_id: myUserId,
          sender_type: senderType,
          content: trimmed,
          created_at: new Date().toISOString(),
          display_name: "我",
        },
      ]);
      return;
    }

    await supabase.from("chat_messages").insert({
      battle_id: battleId,
      user_id: myUserId,
      sender_type: senderType,
      content: trimmed,
    });
  };

  // ── 投票 ──────────────────────────────────────────────
  const handleVote = async (target: "fighter_a" | "fighter_b") => {
    if (hasVoted || !battleId) return;

    if (battleId.startsWith("mock-") || isAuthBypassEnabled) {
      setVotes((prev) => ({ ...prev, [target]: prev[target] + 1 }));
      setHasVoted(target);
      return;
    }

    const { error: voteError } = await supabase.rpc("cast_vote", {
      p_battle_id: battleId,
      p_voted_for: target,
    });

    if (voteError) {
      if (voteError.message.includes("already voted")) {
        alert(t("battle_vote_duplicate"));
      }
      return;
    }
    setHasVoted(target);
  };

  const totalVotes = votes.fighter_a + votes.fighter_b;
  const pctA = totalVotes > 0 ? Math.round((votes.fighter_a / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;

  const vinylCoverA = useMemo(() => {
    if (!battle) return null;
    if (coverDisplayA) return coverDisplayA;
    const raw = battle.song_a_cover ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle, coverDisplayA]);

  const vinylCoverB = useMemo(() => {
    if (!battle) return null;
    if (coverDisplayB) return coverDisplayB;
    const raw = battle.song_b_cover ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle, coverDisplayB]);

  const vinylAvatarA = useMemo(() => {
    if (avatarDisplayA) return avatarDisplayA;
    const raw = battle?.fighter_a_avatar ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle?.fighter_a_avatar, avatarDisplayA]);

  const vinylAvatarB = useMemo(() => {
    if (avatarDisplayB) return avatarDisplayB;
    const raw = battle?.fighter_b_avatar ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle?.fighter_b_avatar, avatarDisplayB]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-orange-400">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm tracking-widest">{t("battle_loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    const errText = error?.startsWith("i18n:") ? t(error.slice(6)) : (error ?? t("battle_load_failed"));
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <div className="text-center">
          <p className="text-2xl">⚠️ {errText}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl border border-zinc-700 px-6 py-3 text-sm hover:border-orange-500">
            {t("battle_back_home_link")}
          </Link>
        </div>
      </div>
    );
  }

  const voteLocked = hasVoted !== null;
  const lyricA = battle.lyrics_a?.trim() ?? "";
  const lyricB = battle.lyrics_b?.trim() ?? "";
  const hasLyrics = Boolean(lyricA || lyricB);

  return (
    <div className={`${fontGlowSansBattle.className} flex min-h-screen flex-col bg-[#0a0a0a] text-zinc-100 antialiased`}>
      {/* 頂部列 */}
      <header className="sticky top-0 z-30 grid grid-cols-3 items-center border-b border-zinc-800 bg-[#0a0a0a]/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.4em] text-zinc-600">AIPOGER</p>
          <h1 className="truncate text-lg font-bold tracking-widest text-zinc-200">{t("battle_title")}</h1>
        </div>
        <div className="flex justify-center">
          <div className="rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-center text-[10px] tracking-wider text-zinc-400">
            {(() => {
              const parts = t("arena_viewers").split("{{n}}");
              if (parts.length === 2) {
                return (
                  <>
                    {parts[0]}
                    <span className="font-bold text-orange-400">{viewerCount}</span>
                    {parts[1]}
                  </>
                );
              }
              return t("arena_viewers", { n: viewerCount });
            })()}
          </div>
        </div>
        <div className="flex justify-end">
          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-xs tracking-wider text-zinc-400 transition hover:border-orange-500 hover:text-orange-400"
          >
            {t("battle_back")}
          </Link>
        </div>
      </header>

      {/* 擂台主體 */}
      <main className="flex-1 overflow-hidden px-3 py-5 md:px-6">
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(224px,292px)_minmax(0,1fr)] lg:items-start">
          {/* 左：左欄 */}
          <div className="order-2 flex min-h-0 flex-col rounded-2xl border border-zinc-800/80 bg-black/25 p-5 md:p-6">
            <VinylDisc
              fighterName={battle.fighter_a_name}
              songName={battle.song_a_name}
              coverUrl={vinylCoverA ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={vinylAvatarA}
              isPlaying={activeDeck === "A"}
              onToggle={() => handleToggleDeck("A")}
              color="#ff6a00"
              accent="orange"
              aiTool={battle.ai_tool_a}
            />
            <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
              <VoteHeartButton
                selected={hasVoted === "fighter_a"}
                voteLocked={voteLocked}
                onVote={() => handleVote("fighter_a")}
              />
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>{t("battle_deck_vote_line", { n: votes.fighter_a })}</span>
                  <span>{pctA}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pctA}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 中：LOGO + VS + 歌詞（無框、白字） */}
          <div className="order-1 flex flex-col items-center lg:order-none">
            <NextImage
              src="/aipoger-logo.png"
              alt="AIPOGER"
              width={128}
              height={128}
              className="h-auto w-[92px] select-none object-contain md:w-[118px]"
              priority
            />
            <p className="mt-1.5 text-center text-[12px] tracking-wide text-zinc-200">{t("battle_tagline_logo")}</p>
            <p className="mt-5 text-[clamp(3rem,8vw,5.25rem)] leading-none text-orange-500">VS</p>
            <p className="mt-3 text-[11px] text-zinc-500">
              {totalVotes === 0 ? t("battle_wait_votes") : t("battle_vote_total", { count: totalVotes })}
            </p>
            <div className="mt-8 min-h-[4.5rem] w-full max-w-sm px-2 text-center text-[13px] leading-[1.65] text-white md:max-w-none md:text-[14px]">
              {hasLyrics ? (
                <div className="space-y-5">
                  {lyricA ? <p className="whitespace-pre-wrap">{lyricA}</p> : null}
                  {lyricA && lyricB ? <hr className="border-zinc-800" /> : null}
                  {lyricB ? <p className="whitespace-pre-wrap">{lyricB}</p> : null}
                </div>
              ) : (
                <p className="text-zinc-500">{t("battle_lyrics_empty")}</p>
              )}
            </div>
          </div>

          {/* 右 */}
          <div className="order-3 flex min-h-0 flex-col rounded-2xl border border-zinc-800/80 bg-black/25 p-5 md:p-6">
            <VinylDisc
              fighterName={battle.fighter_b_name}
              songName={battle.song_b_name}
              coverUrl={vinylCoverB ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={vinylAvatarB}
              isPlaying={activeDeck === "B"}
              onToggle={() => handleToggleDeck("B")}
              color="#3b82f6"
              accent="blue"
              aiTool={battle.ai_tool_b}
            />
            <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
              <VoteHeartButton
                selected={hasVoted === "fighter_b"}
                voteLocked={voteLocked}
                onVote={() => handleVote("fighter_b")}
                alignEnd
              />
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>{t("battle_deck_vote_line", { n: votes.fighter_b })}</span>
                  <span>{pctB}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pctB}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 聊天區 */}
        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-xs font-semibold tracking-widest text-zinc-500">{t("battle_chat_title")}</h2>
          <div
            ref={chatContainerRef}
            className="flex h-[200px] flex-col gap-2 overflow-y-auto rounded-2xl bg-black/50 p-4 scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {messages.length === 0 && (
              <p className="text-center text-xs text-zinc-600">{t("no_messages")}</p>
            )}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} currentUserId={myUserId} />
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="mt-3 flex gap-2" onSubmit={handleSend}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={t("chat_placeholder")}
              maxLength={200}
              className="flex-1 rounded-xl border border-zinc-700 bg-black/60 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("chat_send")}
            </button>
          </form>
        </section>
      </main>

      {/* 隱藏音檔 */}
      <audio ref={audioARef} src={audioUrls.A ?? undefined} onEnded={() => setActiveDeck((p) => (p === "A" ? null : p))} />
      <audio ref={audioBRef} src={audioUrls.B ?? undefined} onEnded={() => setActiveDeck((p) => (p === "B" ? null : p))} />
    </div>
  );
}

// ─── Page export（只負責 Suspense 包裝）───────────────────

function BattleArenaSuspenseFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-orange-400 text-sm tracking-widest">
      {t("common_loading")}
    </div>
  );
}

export default function BattleArenaPage() {
  return (
    <Suspense fallback={<BattleArenaSuspenseFallback />}>
      <BattleArenaContent />
    </Suspense>
  );
}