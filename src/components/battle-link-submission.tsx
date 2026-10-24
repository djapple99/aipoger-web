"use client";
import Image from "next/image";
import { IMAGE_UPLOAD_ACCEPT, isAllowedImageUploadFile, imageContentType } from "@/lib/image-upload-policy";
import { qCrashDisplayLang } from "@/lib/q-crash-rules";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Link2, Swords } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { dropModeLabel, battleClip, type DropPlaybackMode, type BattleLinkPlayback } from "@/lib/battle-link-rules";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import BattleMediaPlayer, { type BattlePlayerHandle } from "@/components/battle-media-player";

type Preview = { audioUrl?: string; token: string; title: string; creator: string; cover: string; duration: number; playback: BattleLinkPlayback };
type Target = { id: string; title: string; genre: string; mode: DropPlaybackMode; scheduledStartAt: string | null };
const errors: Record<string, [string, string]> = {
  AUTH_REQUIRED: ["請先登入，再貼上你的作品連結。", "Sign in to submit your work."],
  OWN_WORK_REQUIRED: ["請選擇你自己投稿的作品。", "Choose one of your own works."],
  PUBLIC_SINGLE_REQUIRED: ["請使用公開單曲，專輯與合輯不能參戰。", "Use a public single. Albums and compilations cannot enter."],
  SOURCE_DURATION_UNAVAILABLE: ["暫時讀不到歌曲長度，請稍後重試或換另一個公開作品連結。", "Could not read the track length. Retry or use another public link."],
  PREVIEW_EXPIRED: ["連結資料已過期，請重新讀取。", "Read the link again; its preview expired."],
  SOURCE_UNAVAILABLE: ["來源暫時無法播放，請確認作品公開後重試。", "Source unavailable. Confirm the work is public and retry."],
  BATTLE_LINK_UNSUPPORTED: ["請使用 Suno、YouTube 或自己的 Aipoger 單曲連結。", "Use Suno, YouTube, or your own Aipoger single."],
  UNSUPPORTED_LINK: ["請使用 Suno、YouTube 或自己的 Aipoger 單曲連結。", "Use Suno, YouTube, or your own Aipoger single."],
  CLIP_OUT_OF_RANGE: ["歌曲長度不足，或選擇的片段超出歌曲結尾。", "The selected segment exceeds the track length."],
  TARGET_CLOSED: ["這場邀請已關閉或已被接戰，請回挑戰池。", "This invitation is closed or already accepted."],
  ACTIVE_BATTLE_ROLE: ["你在這個參賽位置已有進行中的挑戰，請先完成或取消。", "Finish or cancel your active challenge in this role first."],
};
export default function BattleLinkSubmission({ mode }: { mode: "drop" | "q_crash" }) {
  const { t } = useI18n();
  const params = useSearchParams(); const router = useRouter(); const q = mode === "q_crash";
  const lang = q ? qCrashDisplayLang(params.get("lang")) : params.get("lang") || "zh";
  const v = (zh: string, en: string, ja = en, ko = en) => lang === "zh" ? zh : lang === "ja" ? ja : lang === "ko" ? ko : en;
  const targetId = params.get("challengeEntryId"); const join = q ? params.get("join") : null;
  const [target, setTarget] = useState<Target | null>(null); const [contextReady, setContextReady] = useState(!targetId && !join);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPath = useRef<string | null>(null);
  const [url, setUrl] = useState(""); const [preview, setPreview] = useState<Preview | null>(null);
  const [title, setTitle] = useState(""); const [creator, setCreator] = useState(""); const [genre, setGenre] = useState("");
  const [lyrics, setLyrics] = useState(""); const [aiTool, setAiTool] = useState("Suno");
  const [playbackMode, setPlaybackMode] = useState<DropPlaybackMode>("60"); const [start, setStart] = useState(0);
  const [rights, setRights] = useState(false); const [busy, setBusy] = useState(false); const [reading, setReading] = useState(false);
  const [error, setError] = useState(""); const [startPreset, setStartPreset] = useState("10"); const [startAt, setStartAt] = useState("");
  const [voteMinutes, setVoteMinutes] = useState(120); const [invited, setInvited] = useState("");
  const [creatorQuery, setCreatorQuery] = useState(""); const [creators, setCreators] = useState<{ id: string; name: string }[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null); const [queueId, setQueueId] = useState<string | null>(null);
  const player = useRef<BattlePlayerHandle>(null); const readSequence = useRef(0); const actor = useRef<string | null>(null);
  const showError = (code: string) => setError(errors[code] ? v(...errors[code]) : /ACTIVE_BATTLE/.test(code) ? v(...errors.ACTIVE_BATTLE_ROLE) : /TARGET_/.test(code) ? v(...errors.TARGET_CLOSED) : v("暫時無法完成，請重試。", "Could not complete this request. Please retry."));
  const authHeaders = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      const next = location.pathname + location.search; rememberAuthNextPath(next); router.push(`/auth?next=${encodeURIComponent(next)}`);
      throw new Error("AUTH_REQUIRED");
    }
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  };
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id || null;
      if (actor.current !== null && actor.current !== id) { readSequence.current++; setPreview(null); setRights(false); setRequestId(null); setQueueId(null); }
      actor.current = id;
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!targetId && !join) return;
    setContextReady(false);
    void (async () => {
      try {
        const response = await fetch(join ? `/api/q-crash/${encodeURIComponent(join)}` : `/api/battle-links?target=${encodeURIComponent(targetId!)}`, { headers: join ? await authHeaders() : undefined });
        const data = await response.json(); if (!active) return;
        if (!response.ok || (join && !data.viewer?.canJoin)) throw new Error("TARGET_CLOSED");
        if (join) setVoteMinutes(data.card.durationMinutes);
        else { setTarget(data.target); setGenre(data.target.genre); setPlaybackMode(data.target.mode); }
        setContextReady(true);
      } catch (e) { if (active) showError((e as Error).message); }
    })();
    return () => { active = false; };
    // Context is bound to the target URL; form edits never reload the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, join]);
  useEffect(() => {
    if (q && !join && creatorQuery.trim().length >= 2) {
      const controller = new AbortController(); const timer = setTimeout(() => {
        void authHeaders().then(headers => fetch(`/api/q-crash/creators?q=${encodeURIComponent(creatorQuery)}`, { headers, signal: controller.signal })).then(r => r.json()).then(p => setCreators(p.creators || [])).catch(() => {});
      }, 300);
      return () => { clearTimeout(timer); controller.abort(); };
    }
    setCreators([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorQuery, q, join]);
  const readLink = async () => {
    const sequence = ++readSequence.current; setReading(true); setError(""); setPreview(null); setRights(false);
    try {
      const response = await fetch("/api/battle-links", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ action: "preview", url }) });
      const data = await response.json(); if (sequence !== readSequence.current) return;
      if (!response.ok) throw new Error(data.error);
      setPreview(data.preview); setTitle(data.preview.title); setCreator(data.preview.creator || ""); setStart(0);
    } catch (e) { if (sequence === readSequence.current) showError((e as Error).message); }
    finally { if (sequence === readSequence.current) setReading(false); }
  };
  const clip = preview ? battleClip(q ? "full" : playbackMode, preview.duration, start) : null;
  const submit = async () => {
    if (!preview || !rights || !clip || !contextReady) return;
    setBusy(true); setError(""); player.current?.pause();
    try {
      const headers = await authHeaders(); const id = requestId || crypto.randomUUID(); setRequestId(id);
      let entryId = queueId;
      if (!entryId) {
        if (coverFile && !coverPath.current) {
          const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const userId = (await supabase.auth.getSession()).data.session!.user.id;
          const path = `${userId}/q-crash-covers/${id}.${ext}`;
          const upload = await supabase.storage.from("battle-audio").upload(path, coverFile, { upsert: true, contentType: imageContentType(coverFile) });
          if (upload.error) throw upload.error;
          coverPath.current = path;
        }
        const response = await fetch("/api/battle-links", { method: "POST", headers, body: JSON.stringify({ action: "submit", requestId: id, previewToken: preview.token, battleMode: mode, playbackMode, clipStart: start, title, creator, genre, aiTool, lyrics, confirmedRights: rights, coverPath: coverPath.current, targetId: targetId || null, joinCardId: join, ...(startPreset === "custom" ? { startAt: new Date(startAt).toISOString() } : { startPreset: Number(startPreset) }) }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error); entryId = data.queueId; setQueueId(entryId);
      }
      const endpoint = q ? join ? `/api/q-crash/${encodeURIComponent(join)}/join` : "/api/q-crash" : "/api/battle-pool/attempt-matchmaking";
      const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(q ? { queueId: entryId, rightsConfirmed: true, durationMinutes: voteMinutes, invitedUserId: invited || null } : { queueId: entryId, targetQueueId: targetId || null }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      router.push(q ? `/battle/q-crash/${data.cardId}?lang=${lang}` : `/battle/${data.row?.match_group_id || entryId}?lang=${lang}`);
    } catch (e) { showError((e as Error).message); } finally { setBusy(false); }
  };
  const input = "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-black/70 px-3 py-3 text-base text-white focus:border-orange-400 focus:outline-none";
  const panel = "min-w-0 rounded-[1.75rem] border border-white/12 bg-black/65 p-5 md:p-7";
  return <main className={`min-h-screen bg-[#070809] px-4 pb-20 pt-6 text-white ${q ? "[background-image:radial-gradient(ellipse_at_top,rgba(34,211,238,.1),transparent_60%)]" : "[background-image:radial-gradient(ellipse_at_top,rgba(249,115,22,.12),transparent_60%)]"}`}>
    <div className="mx-auto max-w-5xl">
      <Link href={`/battle?lang=${lang}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400"><ArrowLeft size={17} />{v("返回鬥場", "Back to Battle", "Battleに戻る", "Battle로 돌아가기")}</Link>
      <div className="mb-7 mt-4 flex items-start justify-between gap-4"><div><p className={q ? "text-xs tracking-[.25em] text-cyan-300" : "text-xs tracking-[.25em] text-orange-300"}>AIPOGER · {q ? "Q CRASH" : "DROP BATTLE"}</p><h1 className="mt-2 text-3xl font-black md:text-4xl">{q ? join ? v("加入作品 B", "Add Work B") : v("兩首歌，讓聽眾決定", "Two tracks. Let listeners decide.") : targetId ? v("接受挑戰", "Accept the challenge", "挑戦を受ける", "도전 수락") : v("發起 Drop Battle", "Start a Drop Battle", "Drop Battleを始める", "Drop Battle 시작")}</h1><p className="mt-3 text-sm leading-6 text-zinc-400">{v("貼上作品連結，在這裡播放、比較與投票。", "Paste a work link. Listen, compare, and vote here.", "作品リンクを貼って、ここで聴き比べて投票。", "작품 링크를 붙여 넣고 여기서 듣고 비교하고 투표하세요.")}</p></div><Swords className={q ? "shrink-0 text-cyan-400" : "shrink-0 text-orange-400"} size={32} /></div>
      <div className="grid items-start gap-5 md:grid-cols-2">
        <section className={panel}>
          <fieldset disabled={busy || Boolean(requestId)} className="min-w-0 space-y-5 disabled:opacity-70">
            <label className="block text-sm font-bold"><span className="flex items-center gap-2"><Link2 size={17} />{v("作品連結", "Work link", "作品リンク", "작품 링크")}</span><input type="url" value={url} onChange={e => { readSequence.current++; setUrl(e.target.value); setPreview(null); setRights(false); setReading(false); setCoverFile(null); coverPath.current = null; }} placeholder="Suno / YouTube / Aipoger" className={input} /><span className="mt-2 block text-xs leading-5 text-zinc-500">{v("Suno、YouTube，或你自己在 Aipoger 投稿的公開單曲。", "Suno, YouTube, or your own public Aipoger single.", "Suno、YouTube、または自分の公開Aipoger楽曲。", "Suno, YouTube 또는 Aipoger에 올린 내 공개 곡.")}</span></label>
            <button type="button" disabled={reading || !url.trim()} onClick={() => void readLink()} className="min-h-11 w-full rounded-xl border border-orange-300/45 px-4 py-3 font-bold text-orange-200 disabled:opacity-40">{reading ? v("讀取中…", "Reading…", "読み込み中…", "불러오는 중…") : v("讀取作品", "Read work", "作品を読み込む", "작품 불러오기")}</button>
            {preview && <><label className="block text-sm">{v("歌名", "Track title", "曲名", "곡 제목")}<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} className={input} /></label><label className="block text-sm">{v("創作者／舞台名", "Creator / stage name", "クリエイター名", "창작자 이름")}<input value={creator} onChange={e => setCreator(e.target.value)} maxLength={80} className={input} /></label></>}
            <label className="block text-sm">{v("曲風", "Genre", "ジャンル", "장르")}<select value={genre} disabled={Boolean(target)} onChange={e => setGenre(e.target.value)} className={input}><option value="">{v("選擇曲風", "Choose genre", "ジャンルを選択", "장르 선택")}</option>{MUSIC_GENRE_OPTIONS.map(g => <option key={g.value} value={g.value}>{t(g.labelKey)}</option>)}</select></label>
            {preview?.cover && <Image src={preview.cover} alt="" width={128} height={128} unoptimized className="h-28 w-28 rounded-xl object-cover" />}
            <label className="block text-sm">{v("作品封面（選填）", "Work cover (optional)", "カバー（任意）", "작품 표지 (선택)")}<input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (!isAllowedImageUploadFile(file) || file.size > 10 * 1024 * 1024) { setError(v("請使用 10MB 以內的 JPG、PNG、WebP 或 GIF。", "Use JPG, PNG, WebP, or GIF up to 10MB.")); e.target.value = ""; return; } setCoverFile(file); coverPath.current = null; }} className={input} /></label>
            <label className="block text-sm">{v("創作工具", "Creation tool", "制作ツール", "제작 도구")}<input value={aiTool} onChange={e => setAiTool(e.target.value)} className={input} maxLength={80} /></label>
            <label className="block text-sm">{v("歌詞（選填）", "Lyrics (optional)", "歌詞（任意）", "가사 (선택)")}<textarea value={lyrics} onChange={e => setLyrics(e.target.value)} maxLength={8000} rows={4} className={input} /></label>
          </fieldset>
        </section>
        <section className={panel}>
          <fieldset disabled={busy || Boolean(requestId)} className="min-w-0 space-y-5">
            {!q && <><p className="text-sm font-bold">{target ? v("沿用發起者設定", "Host's format", "主催者の設定", "주최자 설정") : v("每首播放長度", "Playback per track", "1曲の再生時間", "곡당 재생 길이")}</p><div className="grid grid-cols-3 gap-2">{(target?.mode === "legacy45" ? ["legacy45"] : ["60", "90", "full"]).map(m => <button type="button" key={m} disabled={Boolean(target)} onClick={() => { setPlaybackMode(m as DropPlaybackMode); setStart(0); }} aria-pressed={playbackMode === m} className={`min-h-14 rounded-xl border px-2 text-sm font-black ${playbackMode === m ? "border-orange-300 bg-orange-500/15 text-orange-200" : "border-white/15 text-zinc-400"}`}>{dropModeLabel(m, lang)}</button>)}</div>{target && <p className="text-xs leading-5 text-zinc-400">{target.title} · {dropModeLabel(target.mode, lang)}</p>}</>}
            {preview && <><p className="text-xs text-zinc-400">{Math.floor(preview.duration / 60)}:{String(Math.floor(preview.duration % 60)).padStart(2, "0")}</p>{!q && playbackMode !== "full" && <label className="block text-sm">{v("片段起點（秒）", "Segment start (seconds)", "開始位置（秒）", "시작 위치 (초)")}<input type="number" min={0} max={Math.max(0, preview.duration - (playbackMode === "legacy45" ? 45 : Number(playbackMode)))} step={0.1} value={start} onChange={e => setStart(Number(e.target.value))} className={input} /></label>}{!clip && <p role="alert" className="text-sm text-orange-200">{v(...errors.CLIP_OUT_OF_RANGE)}</p>}</>}
            {!q && !targetId && <><label className="block text-sm">{v("開始時間", "Start time", "開始時刻", "시작 시간")}<select value={startPreset} onChange={e => setStartPreset(e.target.value)} className={input}>{[10, 15, 20].map(n => <option key={n} value={n}>{v(`發布後 ${n} 分鐘`, `${n} minutes after publishing`, `公開から${n}分後`, `공개 후 ${n}분`)}</option>)}<option value="custom">{v("自訂時間", "Custom time", "時刻を指定", "시간 지정")}</option></select></label>{startPreset === "custom" && <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={input} />}</>}
            {q && !join && <><label className="block text-sm">{v("投票開放時間", "Voting window")}<select value={[30, 120, 720].includes(voteMinutes) ? voteMinutes : "custom"} onChange={e => setVoteMinutes(e.target.value === "custom" ? 1440 : Number(e.target.value))} className={input}><option value={30}>{v("30 分鐘", "30 minutes")}</option><option value={120}>{v("2 小時", "2 hours")}</option><option value={720}>{v("12 小時", "12 hours")}</option><option value="custom">{v("自訂", "Custom")}</option></select></label>{![30, 120, 720].includes(voteMinutes) && <label className="block text-sm">{v("分鐘（30–4320）", "Minutes (30–4320)")}<input type="number" min={30} max={4320} value={voteMinutes} onChange={e => setVoteMinutes(Number(e.target.value))} className={input} /></label>}<label className="block text-sm">{v("邀請創作者（選填）", "Invite a creator (optional)")}<input value={creatorQuery} onChange={e => { setCreatorQuery(e.target.value); setInvited(""); }} className={input} /></label>{creators.map(c => <button type="button" key={c.id} onClick={() => { setInvited(c.id); setCreatorQuery(c.name); setCreators([]); }} className="block min-h-11 w-full text-left text-sm text-cyan-200">{c.name}{invited === c.id ? " ✓" : ""}</button>)}</>}
            <label className="flex items-start gap-3 text-sm leading-6 text-zinc-300"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-orange-500" />{v("我確認這是自己的創作，或已取得權利人許可，並同意以選定方式公開播放。", "I created this track or have permission from its rights holder, and consent to public playback in this format.", "自分の作品、または権利者の許可を得た作品であり、選択した形式での公開再生に同意します。", "직접 창작했거나 권리자의 허락을 받았으며 선택한 형식의 공개 재생에 동의합니다.")}</label>
          </fieldset>
          {preview && clip && <div className="my-5"><BattleMediaPlayer key={`${preview.token}:${clip.start}:${clip.seconds}`} ref={player} audioUrl={preview.audioUrl} playback={{ ...preview.playback, ...clip }} title={title} onError={() => showError("SOURCE_UNAVAILABLE")} /><button type="button" onClick={() => { if (player.current?.paused) void player.current.play().catch(() => showError("SOURCE_UNAVAILABLE")); else player.current?.pause(); }} className="min-h-11 rounded-xl border border-white/20 px-4 py-2 text-sm">{v("試聽／暫停", "Preview / Pause", "試聴／一時停止", "미리 듣기 / 일시 정지")}</button></div>}
          {error && <p role="alert" className="my-4 break-words rounded-xl border border-red-300/25 bg-red-500/10 p-3 text-sm leading-6 text-red-200">{error}</p>}
          <button type="button" disabled={busy || !preview || !rights || !clip || !title.trim() || !creator.trim() || !genre || !contextReady} onClick={() => void submit()} className={`mt-5 min-h-14 w-full rounded-xl px-5 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-35 ${q ? "bg-cyan-300" : "bg-orange-500"}`}>{busy ? v("處理中…", "Saving…", "保存中…", "저장 중…") : requestId ? v("重試完成挑戰", "Retry challenge", "もう一度試す", "다시 시도") : q ? join ? v("確認加入作品 B", "Confirm Work B") : v("建立 Q Crash", "Create Q Crash") : targetId ? v("確認接戰", "Accept challenge", "挑戦を受ける", "도전 수락") : v("發布挑戰卡", "Publish challenge", "挑戦を公開", "도전 공개")}</button>
          {requestId && !busy && <button type="button" onClick={() => { void (async () => {
            setBusy(true);
            try {
              const response = await fetch("/api/battle-pool/cancel-current", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ queueId: queueId || requestId }) });
              if (!response.ok && response.status !== 404) throw new Error("CANCEL_FAILED");
              setQueueId(null); setRequestId(null); setError(""); setRights(false);
            } catch (e) { showError((e as Error).message); } finally { setBusy(false); }
          })(); }} className="mt-3 min-h-11 w-full rounded-xl border border-white/20 text-sm text-zinc-300">{v("取消這次投稿並重新選擇", "Cancel this entry and choose again", "今回の投稿を取り消して選び直す", "이번 참가를 취소하고 다시 선택")}</button>}
          <Link href={`/drop-guide?lang=${lang}`} className="mt-4 inline-flex min-h-11 items-center text-xs text-zinc-400 underline">{v("查看玩法指南", "Read the guide", "遊び方を見る", "이용 안내")}</Link>
        </section>
      </div>
    </div>
  </main>;
}
