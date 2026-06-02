"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import ShareButton from "@/components/share-button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type DailyEntryRoomRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  genre: string | null;
  ai_tool: string | null;
  audio_path: string | null;
  cover_url: string | null;
  status: string | null;
  matched_battle_id: string | null;
  created_at: string | null;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isDirectAudio(path: string) {
  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/") || path.startsWith("blob:");
}

function formatClock(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.ceil(safeMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default function DailyWaitingRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const entryId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [row, setRow] = useState<DailyEntryRoomRow | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [expireRequested, setExpireRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!isUuidLike(entryId)) {
        router.replace(`/battle?lang=${lang}`);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error: queryError } = await supabase
        .from("daily_battle_entries")
        .select("id,user_id,title,genre,ai_tool,audio_path,cover_url,status,matched_battle_id,created_at")
        .eq("id", entryId)
        .maybeSingle<DailyEntryRoomRow>();

      if (!mounted) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      if (!data) {
        router.replace(`/battle?lang=${lang}`);
        return;
      }
      if (data.matched_battle_id) {
        router.replace(`/battle/daily/${encodeURIComponent(data.matched_battle_id)}?lang=${lang}`);
        return;
      }
      if (data.user_id && !session?.user?.id) {
        router.replace(`/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${encodeURIComponent(entryId)}&lang=${lang}`);
        return;
      }
      if (data.user_id && session?.user?.id && data.user_id !== session.user.id) {
        router.replace(`/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${encodeURIComponent(entryId)}&genre=${encodeURIComponent(data.genre || "")}&lang=${lang}`);
        return;
      }

      setRow(data);
      setLoading(false);

      const path = data.audio_path?.trim();
      if (path) {
        if (isDirectAudio(path)) {
          setAudioUrl(path);
        } else {
          const { data: signed } = await supabase.storage.from("battle-audio").createSignedUrl(path, 60 * 60);
          if (mounted) setAudioUrl(signed?.signedUrl ?? null);
        }
      }
    };

    void load();

    const channel = supabase
      .channel(`daily-waiting-room-${entryId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_battle_entries", filter: `id=eq.${entryId}` }, (payload) => {
        const next = payload.new as DailyEntryRoomRow;
        if (next?.matched_battle_id) {
          router.replace(`/battle/daily/${encodeURIComponent(next.matched_battle_id)}?lang=${lang}`);
          return;
        }
        if (next?.id) setRow(next);
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [entryId, lang, router]);

  const expiresMs = useMemo(() => {
    if (!row?.created_at) return NaN;
    return new Date(row.created_at).getTime() + 24 * 60 * 60 * 1000;
  }, [row?.created_at]);
  const msLeft = Number.isFinite(expiresMs) ? expiresMs - now : 0;
  const isEnded = Boolean(row && (row.status === "expired" || row.status === "cancelled" || msLeft <= 0));

  useEffect(() => {
    if (!row || expireRequested || row.status === "expired" || row.status === "cancelled" || msLeft > 0) return;
    setExpireRequested(true);
    void fetch("/api/daily-battle/expire-open-entries", { method: "POST" });
  }, [expireRequested, msLeft, row]);

  const cancelEntry = async () => {
    if (!row) return;
    setCancelBusy(true);
    setCancelError("");
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error(isZh ? "請先登入後再取消 24H Full Song。" : "Sign in to cancel.");
      const response = await fetch("/api/daily-battle/cancel-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryId: row.id }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Cancel failed.");
      setRow({ ...row, status: "cancelled" });
    } catch (err) {
      setCancelError(String((err as { message?: string })?.message ?? err));
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-5 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_16%_12%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(255,106,0,0.2),transparent_30%),linear-gradient(180deg,#050505,#08080a_58%,#050505)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href={`/battle?lang=${lang}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:border-cyan-200/60 hover:text-white">
          AIPOGER 24H
        </Link>
        <LangToggle variant="inline" />
      </div>

      <section className="relative z-10 mx-auto mt-10 w-full max-w-5xl rounded-[2rem] border border-cyan-200/22 bg-black/72 p-6 shadow-[0_0_80px_rgba(0,203,255,0.12)] backdrop-blur md:p-8">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-cyan-100/70">24H FULL SONG WAITING ROOM</p>
            <h1 className="mt-4 text-3xl font-black">{isZh ? "正在讀取 24H 等待房…" : "Loading 24H waiting room..."}</h1>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-sm font-bold text-red-100">{error}</p>
            <Link href={`/battle?lang=${lang}`} className="mt-5 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-black">
              {isZh ? "回鬥歌場" : "Back to Battle"}
            </Link>
          </div>
        ) : row ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-cyan-100/70">24H FULL SONG WAITING ROOM</p>
              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                {isEnded ? (isZh ? "這張戰帖已結束" : "This card has ended") : isZh ? "等待整首歌挑戰者" : "Waiting for full-track challenger"}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-300">
                {isEnded
                  ? isZh
                    ? "24 小時內沒有對手接受，這張 Full Song 戰帖會從公開池移除。你可以重新開一張。"
                    : "No challenger joined within 24 hours. Open a new Full Song card when ready."
                  : isZh
                    ? "你可以留在這裡確認作品、播放整首歌、分享戰帖。有人接受後會自動進 24H 對決房。"
                    : "Stay here to check the full track, share the card, and enter the battle room automatically after a challenger joins."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ShareButton
                  title={isZh ? "AIPOGER 24H Full Song 戰帖" : "AIPOGER 24H Full Song Challenge"}
                  text={
                    isZh
                      ? `《${row.title || "未命名作品"}》正在等人接 24H 整首歌對決。`
                      : `"${row.title || "Untitled Track"}" is waiting for a 24H full-track challenger.`
                  }
                  url={`/battle/setup?battleMode=daily&dailyPairing=invite&challengeDailyEntryId=${row.id}&genre=${encodeURIComponent(row.genre || "")}&lang=${lang}`}
                  label={isZh ? "分享戰帖" : "Share Card"}
                  copiedLabel={isZh ? "戰帖已複製" : "Card copied"}
                  className="px-5 py-3 text-sm"
                />
                <Link href={`/battle?lang=${lang}`} className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100">
                  {isZh ? "回公開池" : "Back to Pool"}
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200/80">
                    {isEnded ? (isZh ? "已結束" : "Ended") : isZh ? "接受挑戰中" : "Open For Challenge"}
                  </p>
                  <h2 className="mt-3 break-words text-3xl font-black text-white">{row.title || "24H Full Song"}</h2>
                  <p className="mt-2 text-sm font-bold text-zinc-400">
                    {row.genre || "AI Music"} · {row.ai_tool || "AI Tool"}
                  </p>
                </div>
                <div className="shrink-0 rounded-full border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-50">
                  {isEnded ? (isZh ? "已移除" : "Closed") : formatClock(msLeft)}
                </div>
              </div>

              {row.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.cover_url} alt="" className="mt-5 aspect-video w-full rounded-2xl border border-white/10 object-cover" />
              ) : null}

              <div className="mt-5 rounded-[1.25rem] border border-cyan-200/20 bg-cyan-300/[0.07] p-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100/70">FULL TRACK PREVIEW</p>
                <audio ref={audioRef} src={audioUrl ?? undefined} controls preload="metadata" className="mt-4 w-full accent-cyan-300" />
                <p className="mt-3 text-xs font-bold leading-5 text-zinc-500">
                  {isZh ? "這裡播放完整作品。正式對決成立後，觀眾會在 24H 房間聽 A/B 兩首再投票。" : "This previews the full track. Once matched, listeners hear both full tracks in the 24H room."}
                </p>
              </div>

              {cancelError ? (
                <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{cancelError}</p>
              ) : null}
              {!isEnded ? (
                <button
                  type="button"
                  onClick={cancelEntry}
                  disabled={cancelBusy}
                  className="mt-4 w-full rounded-full border border-red-300/30 bg-red-500/10 px-5 py-3 text-sm font-black text-red-100 transition hover:border-red-100 hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-55"
                >
                  {cancelBusy ? (isZh ? "取消中…" : "Cancelling...") : isZh ? "取消這張 24H 戰帖" : "Cancel This 24H Card"}
                </button>
              ) : (
                <Link href={`/battle/setup?battleMode=daily&lang=${lang}`} className="mt-4 block rounded-full bg-cyan-300 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-cyan-100">
                  {isZh ? "重新開 24H Full Song" : "Open New 24H Full Song"}
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
