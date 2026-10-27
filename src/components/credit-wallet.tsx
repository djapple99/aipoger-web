"use client";
import Link from "next/link";
import type { Lang } from "@/lib/locale";
import { creditCopy } from "@/lib/credit-copy";

export default function CreditWallet({ lang, balance, debt = 0 }: { lang: Lang; balance: number | null; debt?: number }) {
  const t = (zh: string, en: string, ja: string, ko: string) => ({ zh, en, ja, ko })[lang];
  const tasks = [
    { title: t("盲聽評測", "Blind comparison", "ブラインド比較", "블라인드 비교"), value: "+3", href: "/battle/listen", detail: t("兩首各聽至少 8 秒後完成選擇，同一配對領一次。", "Listen to both tracks for at least 8 seconds and choose. Once per pair.", "両曲を8秒以上聴いて選択。同じペアで1回。", "두 곡을 각각 8초 이상 듣고 선택하세요. 같은 곡 쌍당 한 번입니다.") },
    { title: t("評分與評論", "Rate & review", "評価とレビュー", "평점과 리뷰"), value: "+10", href: "/ai-music#works", detail: t("為他人作品評分，留下至少 20 字且通過基本反灌水的評論；每作品一次。", "Rate another creator's work with at least 20 letters/numbers and basic spam checks. Once per work.", "他の作者を評価し、20文字以上・基本スパム確認済みのレビュー。作品ごとに1回。", "다른 창작자의 작품에 평점과 20자 이상 리뷰를 남기고 기본 스팸 검사를 통과하세요. 작품당 한 번입니다.") },
    { title: t("每日登入回訪", "Daily visit", "毎日のログイン訪問", "매일 로그인 방문"), value: "+15", href: "/", detail: t("登入後造訪網站自動計入，台灣時間每天一次。", "Automatically counted when you visit while signed in. Once per Taiwan day.", "ログインして訪問すると自動付与。台湾時間で1日1回。", "로그인 상태로 방문하면 자동 지급됩니다. 대만 시간 하루 한 번입니다.") },
    { title: t("送出愛心", "Give a Heart", "Heartを送る", "Heart 보내기"), value: "+3", href: "/mv", detail: t("支持他人的歌曲或 MV；同一作品淨獎勵一次，取消會追回。", "Support another creator's song or MV. One net award per work; cancelling reclaims it.", "他の作者の曲・MVを応援。作品ごとに1回、取消で回収。", "다른 창작자의 곡이나 MV를 응원하세요. 작품당 순보상 한 번이며 취소 시 회수됩니다.") },
  ];
  const path = (href: string) => { const [base, hash] = href.split("#"); return `${base}?lang=${lang}${hash ? `#${hash}` : ""}`; };
  return <div className="space-y-5">
    <p className="text-sm text-zinc-400">{t("目前可用", "Available now", "利用可能", "사용 가능")} <strong className="ml-2 text-3xl text-orange-300">{balance ?? "—"}</strong> Credit</p>
    {debt > 0 && <p role="status" className="text-sm text-orange-200">{creditCopy(lang).debt}：{debt} Credit</p>}
    <section><h3 className="mb-3 text-lg font-black">{t("點數不夠？從這裡補起來", "Earn more Credit", "Creditを増やす", "Credit 더 모으기")}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{tasks.map(task => <Link key={task.href} href={path(task.href)} className="rounded-xl border border-white/15 bg-white/[0.025] p-4 transition hover:border-orange-300/50"><span className="flex items-center justify-between gap-3 font-bold">{task.title}<b className="text-orange-300">{task.value}</b></span><span className="mt-2 block text-xs leading-6 text-zinc-400">{task.detail}</span></Link>)}</div>
      <p className="mt-3 text-xs leading-6 text-zinc-400">{t("創作者首次回覆每則他人評論另得 2 點，不限總次數，同一評論不重複發點。", "Creators earn 2 Credit for their first reply to each listener comment. No total cap; no repeat award for the same comment.", "作者の初回返信はコメントごとに2点。総回数の上限なし、同じコメントには再付与しません。", "창작자의 첫 답글은 댓글당 2점입니다. 총 횟수 제한은 없고 같은 댓글에는 중복 지급하지 않습니다.")}</p>
    </section>
    <section className="rounded-xl border border-orange-300/25 p-4"><h3 className="font-black">{t("點數怎麼用", "Spend Credit", "Creditの使い方", "Credit 사용 방법")}</h3>
      <p className="mt-2 text-sm leading-7 text-zinc-300">{t("表情與氛圍：新提示詞與 A／B／C 對照卡，每次複製 5 點。", "Expression & mood: each copy of a new prompt or A/B/C card costs 5 Credit.", "表情・雰囲気の新PromptとA/B/Cカードはコピー1回5点。", "표정·분위기 새 프롬프트와 A/B/C 카드는 복사당 5점입니다.")}</p>
      <p className="mt-2 text-sm leading-7 text-zinc-300">{t("作品投稿：每 168 小時（一週）前三件免費，之後每件成功投稿扣 60 點。從第一件成功投稿起算，連結與 MP3 共用額度；刪除不退額度。", "Submissions: the first 3 are free per 168 hours (one week), then 60 Credit per successful work. The window starts with your first successful submission; links and MP3s share it. Deletion does not refund allowance.", "投稿は168時間（1週間）ごとに最初の3件無料、その後は投稿成功ごとに60点。最初の投稿成功から起算し、リンクとMP3で共有。削除しても枠は戻りません。", "168시간(1주일)마다 첫 3건은 무료이며 이후 제출 성공당 60점입니다. 첫 제출 성공부터 계산하며 링크와 MP3가 한도를 공유합니다. 삭제해도 한도는 복구되지 않습니다.")}</p>
    </section>
    <details className="text-xs leading-6 text-zinc-400"><summary className="min-h-11 cursor-pointer py-2 font-bold">{t("完整點數規則", "Full Credit rules", "Creditの全ルール", "전체 Credit 규칙")}</summary><p>{creditCopy(lang).rules}</p></details>
    <h3 className="border-t border-white/15 pt-4 text-lg font-black">{t("收支紀錄", "Transaction history", "利用履歴", "수입·지출 내역")}</h3>
  </div>;
}
