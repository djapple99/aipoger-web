"use client";
import Link from "next/link";
import { useState } from "react";
import type { Lang } from "@/lib/locale";
import { creditCopy, creditReason } from "@/lib/credit-copy";

type CreditEntry = { id: string; delta: number; reason: string; created_at: string };
const EMPTY_ENTRIES: CreditEntry[] = [];
const HISTORY_PAGE_SIZE = 5;

export default function CreditWallet({ lang, balance, debt = 0, entries = EMPTY_ENTRIES }: { lang: Lang; balance: number | null; debt?: number; entries?: CreditEntry[] }) {
  const [panel, setPanel] = useState<"earn" | "history" | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const sortedEntries = [...entries].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const lastPage = Math.max(0, Math.ceil(sortedEntries.length / HISTORY_PAGE_SIZE) - 1);
  const page = Math.min(historyPage, lastPage);
  const history = sortedEntries.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);
  const toggle = (next: "earn" | "history") => { setPanel(current => current === next ? null : next); setHistoryPage(0); };
  const t = (zh: string, en: string, ja: string, ko: string) => ({ zh, en, ja, ko })[lang];
  const tasks = [
    { title: t("評分與評論", "Rate & review", "評価とレビュー", "평점과 리뷰"), value: "+10", href: "/ai-music#works", detail: t("為他人作品評分，留下至少 20 字且通過基本反灌水的評論；每作品一次。", "Rate another creator's work with at least 20 letters/numbers and basic spam checks. Once per work.", "他の作者を評価し、20文字以上・基本スパム確認済みのレビュー。作品ごとに1回。", "다른 창작자의 작품에 평점과 20자 이상 리뷰를 남기고 기본 스팸 검사를 통과하세요. 작품당 한 번입니다.") },
    { title: t("盲聽評測", "Blind comparison", "ブラインド比較", "블라인드 비교"), value: "+3", href: "/battle/listen", detail: t("兩首各聽至少 8 秒後完成選擇，同一配對領一次。", "Listen to both tracks for at least 8 seconds and choose. Once per pair.", "両曲を8秒以上聴いて選択。同じペアで1回。", "두 곡을 각각 8초 이상 듣고 선택하세요. 같은 곡 쌍당 한 번입니다.") },
    { title: t("每日登入回訪", "Daily visit", "毎日のログイン訪問", "매일 로그인 방문"), value: "+15", href: "/", detail: t("登入後造訪網站自動計入，台灣時間每天一次。", "Automatically counted when you visit while signed in. Once per Taiwan day.", "ログインして訪問すると自動付与。台湾時間で1日1回。", "로그인 상태로 방문하면 자동 지급됩니다. 대만 시간 하루 한 번입니다.") },
    { title: t("送出愛心", "Give a Heart", "Heartを送る", "Heart 보내기"), value: "+3", href: "/mv", detail: t("支持他人的歌曲或 MV；同一作品淨獎勵一次，取消會追回。", "Support another creator's song or MV. One net award per work; cancelling reclaims it.", "他の作者の曲・MVを応援。作品ごとに1回、取消で回収。", "다른 창작자의 곡이나 MV를 응원하세요. 작품당 순보상 한 번이며 취소 시 회수됩니다.") },
  ];
  const path = (href: string) => { const [base, hash] = href.split("#"); return `${base}?lang=${lang}${hash ? `#${hash}` : ""}`; };
  return <div>
    <div className="pb-5">
      <p className="text-xs font-bold tracking-wide text-zinc-400">{t("目前可用", "Available now", "利用可能", "사용 가능")}</p>
      <p className="mt-1 flex items-baseline gap-2"><strong className="text-5xl font-black tracking-tight text-orange-300">{balance ?? "—"}</strong><span className="text-xs text-zinc-500">Credit</span></p>
      {debt > 0 && <p role="status" className="mt-2 text-xs text-orange-200">{creditCopy(lang).debt}：{debt} Credit</p>}
    </div>
    <section className="border-t border-white/10 py-4">
      <h3 className="text-xs font-bold text-zinc-500">{t("使用規則", "How to use", "使い方", "사용 규칙")}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{t("表情與氛圍提示詞／對照卡：每次複製 8 點。", "Expression & mood prompts / comparison cards: 8 Credit per copy.", "表情・雰囲気のPrompt／比較カード：コピー1回8点。", "표정·분위기 프롬프트／비교 카드: 복사당 8점.")}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">{t("投稿：每 168 小時（一週）前三件免費，之後每件成功投稿 60 點。", "Submissions: first 3 free per 168 hours (one week), then 60 Credit per successful work.", "投稿：168時間（1週間）ごとに最初の3件無料。その後は投稿成功ごとに60点。", "제출: 168시간(1주일)마다 첫 3건 무료, 이후 제출 성공당 60점.")}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{t("從第一件成功投稿起算；連結與 MP3 共用，刪除不退額度。", "Starts with your first successful submission. Links and MP3s share the allowance; deletion does not refund it.", "最初の投稿成功から起算。リンク・MP3で共有し、削除しても枠は戻りません。", "첫 제출 성공부터 계산합니다. 링크와 MP3가 한도를 공유하며 삭제해도 복구되지 않습니다.")}</p>
    </section>
    <div className="flex flex-wrap items-center gap-x-6 border-t border-white/10">
      {(["earn", "history"] as const).map(key => <button key={key} type="button" aria-expanded={panel === key} aria-controls={`credit-wallet-${key}`} onClick={() => toggle(key)} className={`inline-flex min-h-11 items-center gap-2 text-xs font-bold transition hover:text-orange-200 ${panel === key ? "text-orange-300" : "text-zinc-300"}`}>
        {key === "earn" ? t("如何賺點數", "Earn Credit", "Creditを増やす", "Credit 모으기") : t("查看收支明細", "View transactions", "収支明細", "내역 보기")}
        <span aria-hidden="true" className={`text-zinc-500 transition-transform ${panel === key ? "rotate-180" : ""}`}>⌄</span>
      </button>)}
    </div>
    {panel === "earn" && <section id="credit-wallet-earn" aria-label={t("賺點任務", "Earning tasks", "Credit獲得タスク", "Credit 획득 활동")} className="border-t border-white/10 pt-1">
      <ul className="divide-y divide-white/8">{tasks.map(task => <li key={task.href}><Link href={path(task.href)} className="block py-3 transition hover:text-orange-200"><span className="flex items-center justify-between gap-3 text-sm font-bold"><span>{task.title} →</span><b className="text-orange-300">{task.value}</b></span><span className="mt-1 block text-xs leading-5 text-zinc-500">{task.detail}</span></Link></li>)}</ul>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{t("創作者首次回覆每則他人評論另得 2 點，不限總次數，同一評論不重複發點。", "Creators earn 2 Credit for their first reply to each listener comment. No total cap; no repeat award for the same comment.", "作者の初回返信はコメントごとに2点。総回数の上限なし、同じコメントには再付与しません。", "창작자의 첫 답글은 댓글당 2점입니다. 총 횟수 제한은 없고 같은 댓글에는 중복 지급하지 않습니다.")}</p>
      <details className="mt-2 text-xs leading-6 text-zinc-500"><summary className="min-h-11 cursor-pointer py-2 font-bold">{t("完整點數規則", "Full Credit rules", "Creditの全ルール", "전체 Credit 규칙")}</summary><p>{creditCopy(lang).rules}</p></details>
    </section>}
    {panel === "history" && <section id="credit-wallet-history" aria-label={t("收支明細", "Transactions", "収支明細", "수입·지출 내역")} className="border-t border-white/10 pt-1">
      {history.length ? <>
        <ul className="divide-y divide-white/8">{history.map(entry => <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div className="min-w-0"><span className="text-zinc-300">{creditReason(lang, entry.reason)}</span><time dateTime={entry.created_at} className="ml-2 text-xs text-zinc-500">{new Date(entry.created_at).toLocaleDateString({zh:"zh-TW",en:"en-US",ja:"ja-JP",ko:"ko-KR"}[lang],{timeZone:"Asia/Taipei",month:"numeric",day:"numeric"})}</time></div><strong className={`shrink-0 tabular-nums ${entry.delta > 0 ? "text-orange-200" : "text-zinc-300"}`}>{entry.delta > 0 ? "+" : ""}{entry.delta}</strong></li>)}</ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1 text-xs text-zinc-500"><span>{page * HISTORY_PAGE_SIZE + 1}–{Math.min((page + 1) * HISTORY_PAGE_SIZE, sortedEntries.length)} / {sortedEntries.length}</span>{lastPage > 0 && <div className="flex gap-4"><button type="button" disabled={page === 0} onClick={() => setHistoryPage(page - 1)} className="min-h-11 font-bold text-zinc-300 disabled:opacity-30">{t("較新", "Newer", "新しい", "최신")}</button><button type="button" disabled={page === lastPage} onClick={() => setHistoryPage(page + 1)} className="min-h-11 font-bold text-zinc-300 disabled:opacity-30">{t("更早", "Older", "以前", "이전")}</button></div>}</div>
      </> : <p className="py-4 text-xs text-zinc-500">{t("尚無收支紀錄。", "No transactions yet.", "利用履歴はまだありません。", "아직 내역이 없습니다.")}</p>}
    </section>}
  </div>;
}
