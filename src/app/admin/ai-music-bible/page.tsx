"use client";

import Link from "next/link";
import { BookOpenText, Check, ChevronLeft, RotateCcw, Save, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { BibleContentKind, BibleContentPayload } from "@/lib/ai-music-bible-content";

type AdminState = "checking" | "login" | "denied" | "ready";
type EditorValue = {
  key: string;
  title?: { zh: string; en: string };
  summary?: { zh: string; en: string };
  use?: { zh: string; en: string };
  copy?: { zh: string; en: string };
  category?: string;
  evidence?: string;
  keywords?: string[];
  meaning?: string;
  recommended?: string;
  sunoWriting?: string;
  note?: string;
};
type EditorItem = {
  kind: BibleContentKind;
  key: string;
  item: EditorValue;
  payload: BibleContentPayload | null;
  hasOverride: boolean;
  updatedAt: string | null;
};
type ApiPayload = { schemaReady?: boolean; items?: EditorItem[]; error?: string };
type Draft = Record<string, string>;

const kindLabels: Record<BibleContentKind, string> = {
  prompt_move: "Prompt 招式",
  lyric_move: "歌詞招式",
  taiwanese_entry: "台語調音",
};

const techniqueFields = [
  ["titleZh", "中文標題"], ["titleEn", "英文標題"],
  ["summaryZh", "中文摘要"], ["summaryEn", "英文摘要"],
  ["useZh", "中文適用情境"], ["useEn", "英文適用情境"],
  ["copyZh", "中文可複製內容"], ["copyEn", "英文可複製內容"],
  ["category", "分類"], ["evidence", "證據層級"], ["keywords", "搜尋關鍵字（逗號分隔）"],
] as const;
const taiwaneseFields = [
  ["meaning", "華語原意"], ["recommended", "推薦漢字／台文"],
  ["sunoWriting", "Suno 實測寫法"], ["note", "發音眉角／備註"], ["category", "分類"],
] as const;
const categoryOptions: Record<BibleContentKind, string[]> = {
  prompt_move: ["foundation", "workflow", "dance", "production", "theory", "recipe"],
  lyric_move: ["structure", "formatting", "vocal", "emotion", "duet", "atmosphere"],
  taiwanese_entry: ["人稱", "動作與狀態", "時間", "情緒與口語", "空間與疑問"],
};

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function draftFromItem(item: EditorItem): Draft {
  const value = item.item;
  if (item.kind === "taiwanese_entry") {
    return { meaning: value.meaning ?? "", recommended: value.recommended ?? "", sunoWriting: value.sunoWriting ?? "", note: value.note ?? "", category: value.category ?? "" };
  }
  const title = value.title ?? { zh: "", en: "" };
  const summary = value.summary ?? { zh: "", en: "" };
  const use = value.use ?? { zh: "", en: "" };
  const copy = value.copy ?? { zh: "", en: "" };
  return {
    titleZh: title.zh, titleEn: title.en,
    summaryZh: summary.zh, summaryEn: summary.en,
    useZh: use.zh, useEn: use.en,
    copyZh: copy.zh, copyEn: copy.en,
    category: value.category ?? "", evidence: value.evidence ?? "field", keywords: (value.keywords ?? []).join(", "),
  };
}

function payloadFromDraft(kind: BibleContentKind, draft: Draft): BibleContentPayload {
  if (kind === "taiwanese_entry") return {
    meaning: draft.meaning, recommended: draft.recommended, sunoWriting: draft.sunoWriting, note: draft.note, category: draft.category,
  };
  return {
    title: { zh: draft.titleZh, en: draft.titleEn },
    summary: { zh: draft.summaryZh, en: draft.summaryEn },
    use: { zh: draft.useZh, en: draft.useEn },
    copy: { zh: draft.copyZh, en: draft.copyEn },
    category: draft.category,
    evidence: draft.evidence as "official" | "field" | "version",
    keywords: draft.keywords.split(",").map((item) => item.trim()).filter(Boolean),
  };
}

function displayTime(value: string | null) {
  if (!value) return "尚未建立自訂內容";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : `最後更新 ${new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)}`;
}

export default function AdminAiMusicBiblePage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [items, setItems] = useState<EditorItem[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [kind, setKind] = useState<BibleContentKind>("prompt_move");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [schemaReady, setSchemaReady] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/ai-music-bible/content", { cache: "no-store", headers: await authHeader() });
    const payload = await response.json().catch(() => null) as ApiPayload | null;
    setLoading(false);
    if (!response.ok) { setError(payload?.error || "聖經資料讀取失敗。"); return false; }
    const nextItems = payload?.items ?? [];
    setItems(nextItems);
    setSchemaReady(payload?.schemaReady !== false);
    setSelectedKey((current) => current && nextItems.some((item) => `${item.kind}:${item.key}` === current) ? current : `${nextItems[0]?.kind ?? ""}:${nextItems[0]?.key ?? ""}`);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setAdminState("login"); return; }
      const allowed = await loadIsAdmin(user.id);
      if (!active) return;
      if (!allowed) { setAdminState("denied"); return; }
      await load();
      if (active) setAdminState("ready");
    })();
    return () => { active = false; };
  }, [load]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) => item.kind === kind && (!normalized || [item.key, item.item.title?.zh, item.item.title?.en, item.item.meaning, item.item.sunoWriting, item.item.summary?.zh].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalized)));
  }, [items, kind, query]);
  const selected = items.find((item) => `${item.kind}:${item.key}` === selectedKey) ?? visibleItems[0] ?? null;

  useEffect(() => {
    if (selected) {
      setSelectedKey(`${selected.kind}:${selected.key}`);
      setDraft(draftFromItem(selected));
    }
  }, [selected]);

  async function save(action: "save" | "reset") {
    if (!selected || busy) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/admin/ai-music-bible/content", {
      method: "PATCH", headers: { "Content-Type": "application/json", ...await authHeader() },
      body: JSON.stringify({ action: action === "reset" ? "reset" : "upsert", kind: selected.kind, key: selected.key, payload: action === "reset" ? undefined : payloadFromDraft(selected.kind, draft) }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) { setError(payload?.error || "儲存失敗。"); return; }
    setMessage(action === "reset" ? "已恢復程式預設內容。" : "已儲存，會員重新整理聖經後即可看到。 ");
    await load();
  }

  if (adminState !== "ready") {
    const checking = adminState === "checking";
    return <main className="min-h-screen bg-[#060606] px-4 pb-16 pt-28 text-white"><section className="mx-auto max-w-2xl rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl"><ShieldCheck className="mx-auto h-10 w-10 text-orange-300" /><p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.34em] text-orange-300/75`}>AIPOGER BIBLE DESK</p><h1 className="mt-3 text-4xl font-black">{checking ? "正在確認後台權限…" : adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>{!checking && <Link href="/auth?next=%2Fadmin%2Fai-music-bible" className="aipo-primary-button mt-7 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-black">登入 owner 帳號</Link>}</section></main>;
  }

  const fields = selected?.kind === "taiwanese_entry" ? taiwaneseFields : techniqueFields;
  return (
    <main className="min-h-screen bg-[#060606] px-4 pb-20 pt-24 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-7">
          <div><Link href="/admin/comments" className="inline-flex items-center gap-1 text-xs font-black text-zinc-500 hover:text-white"><ChevronLeft className="h-4 w-4" />回到管理後台</Link><p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.34em] text-cyan-200/70`}>AIPOGER PRACTICE BIBLE</p><h1 className="mt-2 text-4xl font-black text-white md:text-6xl">聖經內容工作台</h1><p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-400">小地方直接改、儲存後立即套用；按「恢復預設」即可撤回單筆修改。來源與條目 key 仍由系統保護。</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/admin/comments" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-zinc-300 hover:text-white">評論管理</Link><Link href="/admin/moderation" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-zinc-300 hover:text-white">檢舉管理</Link></div>
        </header>

        {!schemaReady && <div className="mt-6 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-4 py-3 text-sm font-bold leading-6 text-amber-100">目前還在使用程式預設資料；Supabase migration 尚未套用，所以暫時不能儲存。部署資料表後本頁會自動啟用。</div>}
        <div className="mt-7 grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="rounded-[1.3rem] border border-white/10 bg-black/45 p-4">
            <div className="flex gap-2 overflow-x-auto pb-1">{(Object.keys(kindLabels) as BibleContentKind[]).map((item) => <button key={item} type="button" onClick={() => { setKind(item); setQuery(""); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${kind === item ? "border-cyan-200/70 bg-cyan-300/15 text-cyan-50" : "border-white/10 text-zinc-500 hover:text-white"}`}>{kindLabels[item]}</button>)}</div>
            <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 focus-within:border-cyan-200/50"><Search className="h-4 w-4 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋條目…" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-700" /></label>
            <p className="mt-4 text-[11px] font-black tracking-[0.12em] text-zinc-600">{visibleItems.length} 筆 · {loading ? "讀取中…" : "選取後編輯"}</p>
            <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto pr-1">{visibleItems.map((item) => <button key={item.key} type="button" onClick={() => setSelectedKey(`${item.kind}:${item.key}`)} className={`rounded-xl border px-3 py-3 text-left transition ${selectedKey === `${item.kind}:${item.key}` ? "border-orange-300/55 bg-orange-400/[0.1]" : "border-white/8 bg-white/[0.02] hover:border-white/25"}`}><div className="flex items-start justify-between gap-2"><strong className="text-sm font-black text-white">{item.item.title?.zh ?? item.item.meaning}</strong>{item.hasOverride && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}</div><span className="mt-1 block truncate text-[11px] font-bold text-zinc-600">{item.key}</span></button>)}</div>
          </aside>

          <section className="rounded-[1.3rem] border border-orange-300/20 bg-black/45 p-5 sm:p-7">
            {selected ? <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5"><div><span className="rounded-full border border-orange-300/25 bg-orange-400/[0.08] px-3 py-1 text-[11px] font-black text-orange-100">{kindLabels[selected.kind]}</span><h2 className="mt-3 text-3xl font-black text-white">{selected.item.title?.zh ?? selected.item.meaning}</h2><p className="mt-1 text-xs font-bold text-zinc-600">{selected.key} · {selected.hasOverride ? displayTime(selected.updatedAt) : "使用程式預設內容"}</p></div><Sparkles className="h-7 w-7 text-orange-300" /></div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">{fields.map(([name, label]) => <label key={name} className={`grid gap-2 text-sm font-black text-zinc-300 ${name.toLowerCase().includes("copy") || name === "note" || name.toLowerCase().includes("summary") ? "md:col-span-2" : ""}`}>{label}{name === "evidence" ? <select value={draft[name] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} className="h-12 rounded-xl border border-white/12 bg-black/60 px-4 font-bold text-white outline-none"><option value="official">官方功能可確認</option><option value="field">愛波哥實測整理</option><option value="version">版本敏感・請重測</option></select> : name === "category" ? <select value={draft[name] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} className="h-12 rounded-xl border border-white/12 bg-black/60 px-4 font-bold text-white outline-none focus:border-cyan-200/55">{categoryOptions[selected.kind].map((option) => <option key={option} value={option}>{option}</option>)}</select> : name.toLowerCase().includes("copy") || name === "note" || name.toLowerCase().includes("summary") ? <textarea rows={name.toLowerCase().includes("copy") ? 5 : 3} value={draft[name] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} className="rounded-xl border border-white/12 bg-black/60 px-4 py-3 font-bold leading-6 text-white outline-none focus:border-cyan-200/55" /> : <input value={draft[name] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))} className="h-12 rounded-xl border border-white/12 bg-black/60 px-4 font-bold text-white outline-none focus:border-cyan-200/55" />}</label>)}</div>
              {message && <p className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm font-bold text-emerald-100">{message}</p>}{error && <p className="mt-5 rounded-xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-sm font-bold text-red-100">{error}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy || !schemaReady} onClick={() => void save("reset")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-5 text-sm font-black text-zinc-300 hover:border-white/30 hover:text-white disabled:opacity-40"><RotateCcw className="h-4 w-4" />恢復預設</button><button type="button" disabled={busy || !schemaReady} onClick={() => void save("save")} className="aipo-primary-button inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-black disabled:opacity-40"><Save className="h-4 w-4" />{busy ? "儲存中…" : "儲存這筆"}</button></div>
            </> : <div className="grid min-h-[30rem] place-items-center text-center text-zinc-500"><BookOpenText className="h-10 w-10 text-orange-300/50" /><p className="mt-4 font-black">請從左側選擇一筆聖經內容</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}
