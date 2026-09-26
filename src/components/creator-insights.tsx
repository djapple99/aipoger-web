"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { createCreatorChoiceRequestScope, ChoiceRequestError, type CreatorChoiceRequestScope } from "@/lib/creator-choice-client";
import type { CreatorInsights, InsightRate } from "@/lib/creator-insights";

const texts = {
  zh: { title: "作品表現", private: "只有你看得到", back: "回到我的作品", period: "最近 28 天", intro: "看看自己的作品如何被聽見、收藏與支持。", loading: "正在讀取作品數據…", failed: "暫時無法取得完整數據，請稍後重試。", retry: "重新整理", search: "搜尋自己的作品", empty: "目前沒有作品數據。", noMatch: "找不到符合的作品。", listeners: "有效聽眾", hearts: "目前支持者", favorites: "目前收藏者", completion: "完聽率", replay: "主動重播率", heartConversion: "聽後 Heart 轉換率", favoriteConversion: "聽後收藏轉換率", collecting: "資料累積中", small: "樣本較少，先觀察變化", battles: "我的正式對戰", noBattles: "這段期間沒有已結算的正式對戰。", votes: "得票率", definitions: "這些數字怎麼算？", note: "聆聽數據從新版紀錄開始，只計登入且非作者本人的聽眾。舊播放與訪客播放不混入比例；不影響月榜。", details: "有效聽眾：一次播放實際聽滿 30 秒，每人每首去重。完聽率：實際聽過至少 85% 不重複段落的播放，占已知長度的播放；暫停再播仍是同一次。主動重播率：有效聽眾中，再次主動播放並聽滿 30 秒的比例，自動接播不算。聽後轉換：有效聆聽後留下、目前仍保留的 Heart 或收藏，占有效聽眾；先前已有的支持不算新增轉換。Heart 會連動收藏，兩項不可相加。支持與收藏人數是目前狀態，不受 28 天區間限制。", battleNote: "只顯示你參與且已正式結算的單場得票率，包含雙方票數；不是歌曲總評分。" },
  en: { title: "Work insights", private: "Only you can see this", back: "Back to my works", period: "Last 28 days", intro: "See how people listen to, save and support your work.", loading: "Loading your insights…", failed: "Complete insights are unavailable. Please try again.", retry: "Refresh", search: "Search your works", empty: "No work insights yet.", noMatch: "No matching works.", listeners: "Valid listeners", hearts: "Current supporters", favorites: "Current saves", completion: "Completion rate", replay: "Intentional replay rate", heartConversion: "Post-listen Heart conversion", favoriteConversion: "Post-listen save conversion", collecting: "Collecting data", small: "Small sample — watch the trend", battles: "My official battles", noBattles: "No settled official battles in this period.", votes: "Vote share", definitions: "How are these calculated?", note: "Listening starts with the new measurement and includes signed-in listeners other than the creator. Legacy and guest plays are excluded from rates. Monthly charts are unchanged.", details: "Valid listeners hear 30 seconds in one play, deduplicated per person and song. Completion means hearing at least 85% of unique audio, among plays with known duration; pause/resume is one play. Replay means a valid listener deliberately starts another play and hears 30 seconds; automatic advances are excluded. Conversion counts support or saves recorded after valid listening and still retained, divided by valid listeners; pre-existing support is excluded from new conversions. Heart also saves the song, so the two cannot be added. Current supporters and saves are not limited to 28 days.", battleNote: "Only your settled official battles appear, with vote counts. This is not an overall song rating." },
  ja: { title: "作品の分析", private: "あなたのみ閲覧できます", back: "マイ作品に戻る", period: "過去28日間", intro: "作品の再生、保存、応援を確認できます。", loading: "データを読み込み中…", failed: "データを取得できません。再試行してください。", retry: "更新", search: "自分の作品を検索", empty: "作品データはまだありません。", noMatch: "一致する作品がありません。", listeners: "有効リスナー", hearts: "現在の応援者", favorites: "現在の保存者", completion: "完聴率", replay: "自発的な再聴率", heartConversion: "聴いた後のHeart率", favoriteConversion: "聴いた後の保存率", collecting: "データ収集中", small: "サンプルが少ないため推移を見てください", battles: "自分の公式対戦", noBattles: "この期間に確定した公式対戦はありません。", votes: "得票率", definitions: "集計方法", note: "新しい計測開始後のログイン済みリスナーを集計し、作者本人・ゲスト・旧データは除外します。月間ランキングには影響しません。", details: "有効リスナーは1回の再生で30秒以上聴いた人です。完聴率は長さが判明している再生のうち、重複しない区間を85%以上聴いた割合です。一時停止と再開は1回の再生です。再聴率は再度自発的に再生して30秒以上聴いた有効リスナーの割合で、自動再生は除外します。転換率は有効な聴取後に記録され現在も残る応援・保存の割合で、以前からの応援は新規転換に含みません。Heartは保存も行うため合算できません。現在の応援者と保存者は28日間に限定されません。", battleNote: "参加した確定済み公式対戦の票数と得票率のみ表示します。作品全体の評価ではありません。" },
  ko: { title: "작품 분석", private: "나만 볼 수 있어요", back: "내 작품으로", period: "최근 28일", intro: "내 작품의 청취, 저장, 응원을 확인하세요.", loading: "데이터를 불러오는 중…", failed: "데이터를 불러올 수 없습니다. 다시 시도하세요.", retry: "새로고침", search: "내 작품 검색", empty: "아직 작품 데이터가 없습니다.", noMatch: "일치하는 작품이 없습니다.", listeners: "유효 청취자", hearts: "현재 응원자", favorites: "현재 저장자", completion: "완청률", replay: "직접 다시 듣기 비율", heartConversion: "청취 후 Heart 전환율", favoriteConversion: "청취 후 저장 전환율", collecting: "데이터 수집 중", small: "표본이 적으니 추이를 확인하세요", battles: "내 공식 대결", noBattles: "이 기간에 확정된 공식 대결이 없습니다.", votes: "득표율", definitions: "집계 방법", note: "새 측정 이후 로그인한 청취자만 집계하며 창작자 본인, 방문자, 이전 재생은 제외합니다. 월간 순위에는 영향을 주지 않습니다.", details: "유효 청취자는 한 번 재생하여 30초 이상 들은 사람입니다. 완청률은 길이가 확인된 재생 중 중복 없는 구간의 85% 이상을 들은 비율이며, 일시정지 후 재개는 같은 재생입니다. 다시 듣기는 유효 청취자가 직접 새 재생을 시작해 30초 이상 들은 비율로 자동 재생은 제외합니다. 전환율은 유효 청취 후 기록되어 현재도 남아 있는 응원 또는 저장의 비율이며 기존 응원은 신규 전환에 포함하지 않습니다. Heart는 저장도 하므로 합산할 수 없습니다. 현재 응원자와 저장자는 28일 범위에 제한되지 않습니다.", battleNote: "참여한 공식 대결의 확정된 득표율과 표수만 표시하며 곡 전체의 평가는 아닙니다." },
};

export function CreatorInsightsView({ data, lang, refresh }: { data: CreatorInsights; lang: keyof typeof texts; refresh?: () => void }) {
  const copy = texts[lang];
  const [search, setSearch] = useState("");
  const tracks = data.tracks.filter(track => `${track.title} ${track.artist}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const rate = (value: InsightRate) => value.percent === null ? copy.collecting : `${value.percent}% · ${value.numerator}/${value.denominator}`;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400"><p>{copy.period} · {new Date(data.from).toLocaleDateString(lang)} – {new Date(data.to).toLocaleDateString(lang)}</p>{refresh && <button className="min-h-11 rounded-xl border border-white/20 px-4 text-white hover:border-orange-300" onClick={refresh}>{copy.retry}</button>}</div>
    <p className="text-sm leading-6 text-zinc-400">{copy.note}</p>
    {data.tracks.length > 0 && <input aria-label={copy.search} placeholder={copy.search} value={search} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full rounded-xl border border-white/15 bg-black px-4 text-white focus:outline-orange-400" />}
    {!tracks.length && <p className="rounded-2xl border border-white/10 p-8 text-zinc-400">{data.tracks.length ? copy.noMatch : copy.empty}</p>}
    {tracks.map(track => <article key={track.id} className="rounded-2xl border border-white/15 bg-zinc-950 p-4 sm:p-6">
      <h2 className="break-words text-xl font-bold text-white">{track.title}</h2><p className="mt-1 text-sm text-zinc-400">{track.artist}</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
        {[[copy.listeners, track.listeners], [copy.hearts, track.supporters], [copy.favorites, track.favorites], [copy.completion, rate(track.completion)], [copy.replay, rate(track.replay)], [copy.heartConversion, rate(track.heartConversion)], [copy.favoriteConversion, rate(track.favoriteConversion)]].map(([label, value]) => <div key={label}><dt className="text-xs leading-5 text-zinc-400">{label}</dt><dd className="mt-1 break-words text-lg font-bold tabular-nums text-orange-100">{value}</dd></div>)}
      </dl>{track.listeners > 0 && track.listeners < 20 && <p className="mt-5 text-xs text-amber-200">{copy.small}</p>}
    </article>)}
    <section className="rounded-2xl border border-white/15 p-4 sm:p-6"><h2 className="text-xl font-bold">{copy.battles}</h2><p className="mt-2 text-sm text-zinc-400">{copy.battleNote}</p>{!data.battles.length ? <p className="mt-4 text-sm text-zinc-400">{copy.noBattles}</p> : <ul className="mt-4 divide-y divide-white/10">{data.battles.map(battle => <li key={battle.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="break-words font-bold">{battle.title} <span className="text-zinc-500">vs</span> {battle.opponent}</p><p className="mt-1 text-xs text-zinc-400">{battle.mode === "q_crash" ? "Q Crash" : "Drop Battle"} · {new Date(battle.archivedAt).toLocaleDateString(lang)}</p></div><p className="text-sm text-orange-100">{copy.votes} {rate(battle.votes)}</p></li>)}</ul>}</section>
    <details className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400"><summary className="cursor-pointer text-zinc-200">{copy.definitions}</summary><p className="mt-3 leading-7">{copy.details}</p></details>
  </div>;
}

export default function CreatorInsightsPage() {
  const { lang } = useI18n();
  const copy = texts[lang];
  const router = useRouter();
  const [scope, setScope] = useState<CreatorChoiceRequestScope | null>();
  const scopeRef = useRef<CreatorChoiceRequestScope | null>(null);
  const [data, setData] = useState<CreatorInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true, seen = false;
    let owner: string | null | undefined;
    const update = (id: string | null, token: string | null) => {
      if (!alive) return;
      if (owner === id) { if (token) scopeRef.current?.updateAccessToken(token); return; }
      owner = id; scopeRef.current?.controller.abort();
      const next = id && token ? createCreatorChoiceRequestScope(id, token) : null;
      scopeRef.current = next; setData(null); setFailed(false); setLoading(Boolean(next)); setScope(next);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { seen = true; update(session?.user.id ?? null, session?.access_token ?? null); });
    const timer = setTimeout(() => { if (!seen) update(null, null); }, 15_000);
    void supabase.auth.getSession().then(({ data }) => { if (!seen) update(data.session?.user.id ?? null, data.session?.access_token ?? null); }).catch(() => { if (!seen) update(null, null); }).finally(() => clearTimeout(timer));
    return () => { alive = false; clearTimeout(timer); subscription.unsubscribe(); scopeRef.current?.controller.abort(); };
  }, []);
  useEffect(() => {
    const signIn = () => router.replace(`/auth?lang=${lang}&next=${encodeURIComponent(`/profile/insights?lang=${lang}`)}`);
    if (scope === null) { signIn(); return; }
    if (!scope) return;
    let alive = true;
    setLoading(true); setFailed(false); setData(null);
    void scope.request<CreatorInsights>("/api/creator-insights").then(result => { if (alive && !scope.controller.signal.aborted) setData(result); }).catch(error => {
      if (!alive || scope.controller.signal.aborted) return;
      if (error instanceof ChoiceRequestError && error.status === 401) signIn();
      else setFailed(true);
    }).finally(() => { if (alive && !scope.controller.signal.aborted) setLoading(false); });
    return () => { alive = false; };
  }, [scope, retry, router, lang]);
  return <main className="min-h-screen bg-black px-4 pb-10 pt-24 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/profile?lang=${lang}`} className="text-sm text-zinc-400 hover:text-white">← {copy.back}</Link><p className="flex items-center gap-2 text-xs text-orange-200"><LockKeyhole size={14}/>{copy.private}</p></div>
    <h1 className="mt-6 flex items-center gap-3 text-3xl font-black sm:text-4xl"><BarChart3 className="text-orange-400"/>{copy.title}</h1><p className="mb-8 mt-3 text-zinc-400">{copy.intro}</p>
    {loading && <p role="status" className="py-12 text-zinc-400">{copy.loading}</p>}
    {failed && <div role="alert" className="rounded-xl border border-orange-300/25 p-6"><p>{copy.failed}</p><button onClick={() => setRetry(value => value + 1)} className="mt-4 min-h-11 rounded-xl bg-orange-400 px-4 font-bold text-black">{copy.retry}</button></div>}
    {data && !loading && <CreatorInsightsView key={scope?.userId} data={data} lang={lang} refresh={() => setRetry(value => value + 1)}/>}
  </div></main>;
}
