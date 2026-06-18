"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { OfficialGatekeeperDrop } from "@/lib/official-gatekeeper-drops";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import {
  AUDIO_UPLOAD_MAX_BYTES_100MB,
  AUDIO_UPLOAD_MAX_LABEL_100MB,
  STANDARD_AUDIO_UPLOAD_ACCEPT,
  audioSizeLabel,
  isAllowedStandardAudioFile,
  standardAudioContentType,
} from "@/lib/audio-upload-policy";

type AdminState = "checking" | "login" | "denied" | "ready";

type AdminDropsPayload = {
  schemaMissing?: boolean;
  drops?: OfficialGatekeeperDrop[];
  error?: string;
};

const GATEKEEPER_AUDIO_ACCEPT = STANDARD_AUDIO_UPLOAD_ACCEPT;

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function AdminGatekeeperDropsPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [drops, setDrops] = useState<OfficialGatekeeperDrop[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => drops.filter((drop) => drop.active && drop.audioPath).length, [drops]);

  const loadData = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/gatekeeper-drops", { headers: await authHeader() });
    const payload = (await response.json().catch(() => null)) as AdminDropsPayload | null;
    if (!response.ok) {
      setError(payload?.error || "官方守門 Drop 讀取失敗。");
      return;
    }
    setSchemaMissing(Boolean(payload?.schemaMissing));
    setDrops(payload?.drops ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setAdminState("login");
        return;
      }
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadData();
    }
    void check();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  function updateLocal(id: string, patch: Partial<OfficialGatekeeperDrop>) {
    setDrops((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function saveDrop(drop: OfficialGatekeeperDrop, patch: Partial<OfficialGatekeeperDrop> = {}) {
    const next = { ...drop, ...patch };
    setBusyId(drop.id);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/gatekeeper-drops", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        id: next.id,
        title: next.title,
        genre: next.genre,
        aiTool: next.aiTool,
        description: next.description,
        audioPath: next.audioPath,
        active: next.active,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { drop?: OfficialGatekeeperDrop; error?: string } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "儲存失敗。");
      return;
    }
    if (payload?.drop) updateLocal(drop.id, payload.drop);
    setMessage(`${next.gateNumber} 已儲存。`);
  }

  async function uploadAudio(drop: OfficialGatekeeperDrop, file: File | null) {
    if (!file) return;
    if (schemaMissing) {
      setError("尚未建立 official_gatekeeper_drops 資料表。請先套用 supabase/20260618_official_gatekeeper_drops.sql，才能保存官方守門 Drop 音檔。");
      return;
    }
    if (!isAllowedStandardAudioFile(file)) {
      setError("音檔格式不支援。請使用 MP3 / WAV / AIFF / M4A / AAC / OGG。");
      return;
    }
    if (file.size > AUDIO_UPLOAD_MAX_BYTES_100MB) {
      setError(`音檔太大：${audioSizeLabel(file)}。官方守門 Drop 單檔上限是 ${AUDIO_UPLOAD_MAX_LABEL_100MB}。`);
      return;
    }
    setBusyId(drop.id);
    setError("");
    setMessage("");
    try {
      const signedResponse = await fetch("/api/admin/gatekeeper-drops/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeader()),
        },
        body: JSON.stringify({ id: drop.id, fileName: file.name, fileSize: file.size }),
      });
      const signed = (await signedResponse.json().catch(() => null)) as { token?: string; path?: string; error?: string } | null;
      if (!signedResponse.ok || !signed?.token || !signed.path) throw new Error(signed?.error || "無法建立上傳連結。");

      const { error: uploadError } = await supabase.storage
        .from("battle-audio")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: standardAudioContentType(file),
        });
      if (uploadError) throw uploadError;

      await saveDrop(drop, { audioPath: signed.path, active: true });
      setMessage(`${drop.gateNumber} 已上傳 ${file.name}（${formatBytes(file.size)}）。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "音檔上傳失敗。");
    } finally {
      setBusyId(null);
    }
  }

  if (adminState === "checking") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <p className="text-sm font-black text-zinc-400">檢查官方守門 Drop 後台權限中...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.2rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">官方守門 Drop 只允許 owner 帳號設定。</p>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
            前往登入
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300/80">AIPOGER OWNER ADMIN</p>
            <h1 className="mt-2 text-4xl font-black text-white">官方守門 Drop</h1>
            <p className="mt-2 text-sm font-bold text-zinc-400">四張常駐 Drop 挑戰卡。owner 只上傳守門歌與啟用；開戰時間由挑戰者建立戰場時設定。</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/admin/battles" className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">
              Battle 管理
            </Link>
            <Link href="/admin/moderation" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200">
              檢舉管理
            </Link>
            <Link href="/battle?lang=zh" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
              鬥歌池
            </Link>
            <LangToggle variant="inline" />
          </nav>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="text-xs font-black text-zinc-500">固定卡片</p>
            <p className="mt-2 text-3xl font-black text-white">{drops.length}</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="text-xs font-black text-zinc-500">已開放</p>
            <p className="mt-2 text-3xl font-black text-white">{activeCount}</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-4">
            <p className="text-xs font-black text-zinc-500">開戰時間</p>
            <p className="mt-2 text-3xl font-black text-white">挑戰者設定</p>
          </div>
        </section>

        <p className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold leading-7 text-red-50">
          後台不需要也不提供時間設定。官方守門 Drop 只是常駐入口；每位挑戰者上傳自己的 Drop 後，才選擇 10 / 15 / 20 分鐘或自訂時間，並分享戰場拉人投票。
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200"
          >
            重新整理
          </button>
        </div>

        {schemaMissing ? (
          <p className="mt-4 rounded-xl border border-orange-300/35 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-100">
            尚未建立資料表。請先套用 `supabase/20260618_official_gatekeeper_drops.sql`，再上傳與啟用官方守門 Drop。
          </p>
        ) : null}
        {error ? <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {drops.map((drop) => (
            <article key={drop.id} className="rounded-[1.2rem] border border-white/10 bg-black/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300/80">{drop.gateNumber}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{drop.title}</h2>
                  <p className="mt-1 text-xs font-bold text-zinc-500">更新：{formatTime(drop.updatedAt)}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === drop.id || !drop.audioPath || schemaMissing}
                  onClick={() => {
                    const next = !drop.active;
                    updateLocal(drop.id, { active: next });
                    void saveDrop(drop, { active: next });
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    drop.active
                      ? "border-red-200/45 bg-red-500/15 text-red-100"
                      : "border-white/12 bg-white/[0.04] text-zinc-300"
                  }`}
                >
                  {drop.active ? "已開放" : "未開放"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-zinc-500">卡片標題</span>
                  <input
                    value={drop.title}
                    maxLength={40}
                    onChange={(event) => updateLocal(drop.id, { title: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-300/70"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-zinc-500">類型徽章</span>
                  <select
                    value={drop.genre}
                    onChange={(event) => updateLocal(drop.id, { genre: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-300/70"
                  >
                    {MUSIC_GENRE_OPTIONS.map((genre) => (
                      <option key={genre.value} value={genre.value} className="bg-zinc-950 text-white">
                        {genre.value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-zinc-500">AI 工具</span>
                  <input
                    value={drop.aiTool}
                    maxLength={40}
                    onChange={(event) => updateLocal(drop.id, { aiTool: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-300/70"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-zinc-500">音檔路徑</span>
                  <input
                    value={drop.audioPath ?? ""}
                    readOnly
                    className="mt-1 w-full truncate rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm font-bold text-zinc-400 outline-none"
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-bold text-zinc-500">一句說明</span>
                <input
                  value={drop.description ?? ""}
                  maxLength={120}
                  onChange={(event) => updateLocal(drop.id, { description: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white outline-none focus:border-orange-300/70"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <label className={`rounded-full border px-4 py-2 text-xs font-black ${schemaMissing ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-500" : "cursor-pointer border-cyan-200/25 bg-cyan-300/10 text-cyan-100"}`}>
                  上傳官方 Drop 音檔
                  <input
                    type="file"
                    accept={GATEKEEPER_AUDIO_ACCEPT}
                    disabled={schemaMissing || busyId === drop.id}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.currentTarget.value = "";
                      void uploadAudio(drop, file);
                    }}
                  />
                </label>
                {schemaMissing ? (
                  <p className="text-xs font-bold text-orange-200/80">需先套用官方守門 Drop SQL，才能上傳保存。</p>
                ) : (
                  <p className="text-xs font-bold text-zinc-500">MP3 / WAV / AIFF / M4A，上限 {AUDIO_UPLOAD_MAX_LABEL_100MB}</p>
                )}
                <button
                  type="button"
                  disabled={busyId === drop.id || schemaMissing}
                  onClick={() => void saveDrop(drop)}
                  className="rounded-full bg-orange-500 px-5 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-wait disabled:opacity-50"
                >
                  {busyId === drop.id ? "處理中" : "儲存設定"}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
