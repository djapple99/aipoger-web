// src/app/battle/[id]/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthBypassEnabled, mockUserId } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
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

// ─── 旋轉唱片元件 ──────────────────────────────────────────
function VinylDisc({
  label,
  fighterName,
  songName,
  coverUrl,
  avatarUrl,
  isPlaying,
  onToggle,
  color,
  aiTool,
}: {
  label: string;
  fighterName: string;
  songName: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  isPlaying: boolean;
  onToggle: () => void;
  color: string;
  aiTool: string | null;
}) {
  const { t } = useI18n();

  const [coverBroken, setCoverBroken] = useState(false);
  const trimmedCover = coverUrl?.trim() ?? "";
  const hasCover = Boolean(trimmedCover) && !coverBroken;
  const initialMark = [...(fighterName.trim() || "?")].slice(0, 1).join("") || "?";
  const trimmedAvatar = avatarUrl?.trim() ?? "";
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatarImg = Boolean(trimmedAvatar) && !avatarBroken;

  useEffect(() => {
    setCoverBroken(false);
  }, [trimmedCover]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [trimmedAvatar]);

  useEffect(() => {
    if (!trimmedCover) return;
    const img = new Image();
    img.onload = () => setCoverBroken(false);
    img.onerror = () => setCoverBroken(true);
    img.src = trimmedCover;
  }, [trimmedCover]);

  const escapedUrl = trimmedCover.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const outerRingStyle: CSSProperties = hasCover
    ? {
        background: `url("${escapedUrl}") center / cover no-repeat`,
        backgroundSize: "cover",
      }
    : {
        background: `conic-gradient(from 0deg, #1a1a1a 0deg, #2a2a2a 30deg, #1a1a1a 60deg, #252525 90deg, #1a1a1a 120deg, #2a2a2a 150deg, #1a1a1a 180deg, #252525 210deg, #1a1a1a 240deg, #2a2a2a 270deg, #1a1a1a 300deg, #252525 330deg, #1a1a1a 360deg)`,
      };

return (
    <div className="flex flex-col items-center gap-5">
      {/* 唱片外框：黑膠紋理為底，頭像左上角，封面在中心 */}
      <div
        className="relative flex h-[240px] w-[240px] items-center justify-center md:h-[300px] md:w-[300px]"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === " " && onToggle()}
        aria-label={isPlaying ? t("deck_pause_aria") : t("deck_play_aria")}
      >
        {/* 黑膠唱片本體：圓形黑膠 + 同心溝槽 */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 ${
            isPlaying ? "shadow-[0_0_40px_rgba(255,106,0,0.4)]" : ""
          }`}
          style={{
            background: hasCover
              ? `linear-gradient(135deg, #111 0%, #1a1a1a 100%)`
              : `linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #111 100%)`,
          }}
        >
          {/* 同心溝槽線 */}
          {[8, 16, 24, 32, 40, 48].map((r) => (
            <div
              key={r}
              className="absolute rounded-full border border-zinc-800/30"
              style={{
                inset: `${r}%`,
                background: "transparent",
              }}
            />
          ))}
          {/* 外圈亮線 */}
          <div className="absolute inset-0 rounded-full border border-zinc-700/40" />
        </div>

        {/* 頭像：唱片左上（加大；有 URL 顯示圖，否則首字） */}
        <div
          className="absolute -left-1 -top-1 z-30 h-[4.25rem] w-[4.25rem] overflow-hidden rounded-full border-[3px] border-orange-500 bg-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.55)] ring-2 ring-black/70 md:h-[5.25rem] md:w-[5.25rem]"
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
            <span className="flex h-full w-full items-center justify-center text-2xl font-black text-orange-400 md:text-3xl">
              {initialMark}
            </span>
          )}
        </div>

        {/* 封面圖：中心圓形貼紙（像真實唱片） */}
        {hasCover ? (
          <div
            className={`relative z-10 flex h-[55%] w-[55%] items-center justify-center overflow-hidden rounded-full ${
              isPlaying ? "animate-spin" : ""
            }`}
            style={{
              animationDuration: isPlaying ? "3s" : undefined,
              animationPlayState: isPlaying ? "running" : "paused",
            }}
          >
            <img
              src={trimmedCover}
              alt={songName}
              className="h-full w-full object-cover"
              onError={() => setCoverBroken(true)}
            />
            {/* 中心孔（縮小） */}
            <div className="absolute inset-[46%] rounded-full bg-zinc-900 ring-1 ring-zinc-700/80" />
            <div className="absolute inset-[49%] rounded-full bg-zinc-950" />
          </div>
        ) : (
          /* 無封面：中心的 Label 區 */
          <div
            className={`relative z-10 flex h-[55%] w-[55%] items-center justify-center overflow-hidden rounded-full ${
              isPlaying ? "animate-spin" : ""
            }`}
            style={{
              background: `linear-gradient(145deg, ${color}33 0%, ${color}66 50%, ${color}22 100%)`,
              animationDuration: isPlaying ? "3s" : undefined,
              animationPlayState: isPlaying ? "running" : "paused",
            }}
          >
            <div className="absolute inset-[42%] rounded-full border border-zinc-800 bg-zinc-900" />
            <div className="absolute inset-[46%] rounded-full bg-zinc-950" />
          </div>
        )}

        {/* 播放中標示 */}
        {isPlaying && (
          <div className="absolute -top-1 -right-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-black shadow-lg">
            ▶
          </div>
        )}
        {label && (
          <div className="absolute -bottom-1 left-1/2 z-20 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/90 px-2.5 py-0.5 text-[9px] font-semibold tracking-widest text-zinc-400">
            {label}
          </div>
        )}
      </div>


      {/* 資訊 */}
      <div className="text-center">
        <p className="text-sm font-bold tracking-widest text-zinc-400">{fighterName}</p>
        <p className="mt-1 text-base font-semibold text-zinc-200">{songName}</p>
        {aiTool ? (
          <p className="mt-1.5 text-xs font-medium tracking-wide text-zinc-500">
            🤖 {aiTool}
          </p>
        ) : null}
        <p className={`mt-1 text-xs ${isPlaying ? "text-orange-400" : "text-zinc-500"}`}>
          {isPlaying ? "播放中" : "待機中"}
        </p>
      </div>

      {/* Play/Pause 按鈕 */}
      <button
        type="button"
        onClick={onToggle}
        className={`rounded-full border-2 px-6 py-2 text-sm font-bold tracking-widest transition-all ${
          isPlaying
            ? "border-orange-500 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
            : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-orange-500 hover:text-orange-400"
        }`}
      >
        {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
      </button>
    </div>
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
  const [myProfileAvatarUrl, setMyProfileAvatarUrl] = useState<string | null>(null);
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

  // 登入者頭像（左上角 DECK A；含 Google OAuth 頭像後援）
  useEffect(() => {
    if (!myUserId || isAuthBypassEnabled) {
      setMyProfileAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("avatar_url")
        .eq("id", myUserId)
        .maybeSingle();

      let raw =
        typeof prof?.avatar_url === "string" && prof.avatar_url.length > 0 ? prof.avatar_url : null;

      if (!raw) {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = user?.user_metadata as Record<string, unknown> | undefined;
        const oauth = meta?.avatar_url ?? meta?.picture;
        if (typeof oauth === "string" && oauth.length > 0) raw = oauth;
      }

      const resolved = await resolveMediaUrl(raw);
      if (!cancelled) setMyProfileAvatarUrl(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [myUserId]);

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
    if (myProfileAvatarUrl) return myProfileAvatarUrl;
    const raw = battle?.fighter_a_avatar ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle?.fighter_a_avatar, avatarDisplayA, myProfileAvatarUrl]);

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

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-zinc-100">
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
      <main className="flex-1 overflow-hidden px-4 py-6 md:px-8">
        {/* 唱片區 */}
        <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* A 隊 */}
          <div className="flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
            <VinylDisc
              label={t("deck_a")}
              fighterName={battle.fighter_a_name}
              songName={battle.song_a_name}
              coverUrl={vinylCoverA ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={myProfileAvatarUrl ?? vinylAvatarA}
              isPlaying={activeDeck === "A"}
              onToggle={() => handleToggleDeck("A")}
              color="#ff6a00"
              aiTool={battle.ai_tool_a}
            />
            {/* 投票按鈕 */}
            <button
              type="button"
              onClick={() => void handleVote("fighter_a")}
              disabled={!!hasVoted}
              className={`mt-4 w-full rounded-2xl border-2 py-3 text-sm font-bold tracking-widest transition-all ${
                hasVoted === "fighter_a"
                  ? "border-orange-500 bg-orange-500/30 text-orange-400"
                  : hasVoted
                    ? "cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-600"
                    : "border-orange-500/50 bg-zinc-800 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500"
              }`}
            >
              {hasVoted === "fighter_a" ? t("voted") : t("vote_a")}
            </button>
            {/* 票數進度 */}
            <div className="mt-3 w-full">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{t("battle_deck_vote_line", { n: votes.fighter_a })}</span>
                <span>{pctA}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pctA}%` }} />
              </div>
            </div>
          </div>

          {/* VS 中間 */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <p className="text-6xl font-black text-orange-500 md:text-8xl">VS</p>
              <p className="mt-2 text-[10px] tracking-widest text-zinc-600">
                {totalVotes === 0 ? t("battle_wait_votes") : t("battle_vote_total", { count: totalVotes })}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-center">
              <p className="text-xs text-zinc-500">{t("first_attack")}</p>
              <p className="text-sm font-bold text-orange-400">A</p>
            </div>
          </div>

          {/* B 隊 */}
          <div className="flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
            <VinylDisc
              label={t("deck_b")}
              fighterName={battle.fighter_b_name}
              songName={battle.song_b_name}
              coverUrl={vinylCoverB ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={vinylAvatarB}
              isPlaying={activeDeck === "B"}
              onToggle={() => handleToggleDeck("B")}
              color="#3b82f6"
              aiTool={battle.ai_tool_b}
            />
            <button
              type="button"
              onClick={() => void handleVote("fighter_b")}
              disabled={!!hasVoted}
              className={`mt-4 w-full rounded-2xl border-2 py-3 text-sm font-bold tracking-widest transition-all ${
                hasVoted === "fighter_b"
                  ? "border-blue-500 bg-blue-500/30 text-blue-400"
                  : hasVoted
                    ? "cursor-not-allowed border-zinc-700 bg-zinc-800 text-zinc-600"
                    : "border-blue-500/50 bg-zinc-800 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500"
              }`}
            >
              {hasVoted === "fighter_b" ? t("voted") : t("vote_b")}
            </button>
            <div className="mt-3 w-full">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>{t("battle_deck_vote_line", { n: votes.fighter_b })}</span>
                <span>{pctB}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pctB}%` }} />
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