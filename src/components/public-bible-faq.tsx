import { BookOpenText, ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { fontRighteous } from "@/lib/fonts";
import { PUBLIC_BIBLE_FAQ, SUNO_QUICK_START_FIELDS, type PublicFaqLocale } from "@/lib/suno-reference-guide";

const copyByLocale: Record<PublicFaqLocale, { eyebrow: string; title: string; body: string; fieldTitle: string; faqTitle: string; note: string; fields: readonly { title: string; body: string }[] }> = {
  zh: {
    eyebrow: "AIPOGER PUBLIC STARTER",
    title: "先懂三個控制，再開始試歌",
    body: "這是公開起手頁，只說清楚最容易混在一起的三件事。完整 Prompt、歌詞、拆軌、台語調音與配方索引仍在練功聖經裡。",
    fieldTitle: "Suno 三欄分工",
    faqTitle: "開始前常見的 5 個問題",
    note: "生成結果會隨模型、設定、歌詞與隨機性改變；實測方法不是成功保證。",
    fields: SUNO_QUICK_START_FIELDS.map((field) => ({ title: field.title.zh, body: field.body.zh })),
  },
  en: {
    eyebrow: "AIPOGER PUBLIC STARTER",
    title: "Understand three controls before testing a song",
    body: "This public starter separates the three inputs most often mixed together. The full prompt, lyric, stem, Taiwanese, and recipe databases remain inside the Practice Bible.",
    fieldTitle: "Three Suno inputs",
    faqTitle: "Five questions before you begin",
    note: "Results change with the model, settings, lyrics, and randomness. Field methods are not guarantees.",
    fields: SUNO_QUICK_START_FIELDS.map((field) => ({ title: field.title.en, body: field.body.en })),
  },
  ja: {
    eyebrow: "AIPOGER PUBLIC STARTER",
    title: "3つのコントロールを理解してから試す",
    body: "よく混同される3つの入力を整理した公開スターターです。Prompt、歌詞、Stem、台湾語、レシピの完全版は実践バイブル内にあります。",
    fieldTitle: "Sunoの3つの入力",
    faqTitle: "始める前の5つの質問",
    note: "結果はモデル、設定、歌詞、ランダム性で変わります。実測方法は成功を保証するものではありません。",
    fields: [
      { title: "音の骨格を決める", body: "ジャンル、年代、グルーヴ、声、主役の楽器、制作の質感で進む方向を決めます。" },
      { title: "歌い方を組み立てる", body: "セクションを分け、1行を短くし、Chorusに覚えられる一文を置きます。" },
      { title: "記憶点に名前を付ける", body: "Chorusの中から、繰り返しやすく検索しやすい短い言葉を選びます。" },
    ],
  },
  ko: {
    eyebrow: "AIPOGER PUBLIC STARTER",
    title: "세 가지 컨트롤을 이해한 뒤 곡을 테스트하세요",
    body: "자주 섞이는 세 입력의 역할을 정리한 공개 스타터입니다. Prompt, 가사, Stem, 대만어와 레시피 전체 자료는 실전 바이블 안에 있습니다.",
    fieldTitle: "Suno의 세 입력",
    faqTitle: "시작 전 자주 묻는 5가지",
    note: "결과는 모델, 설정, 가사와 확률에 따라 달라집니다. 실전 방법이 성공을 보장하지는 않습니다.",
    fields: [
      { title: "사운드 골격 정하기", body: "장르, 시대, 그루브, 보컬, 중심 악기와 프로덕션 질감으로 방향을 정하세요." },
      { title: "어떻게 부를지 설계하기", body: "섹션을 나누고 한 줄을 짧게 쓰며 Chorus에는 기억할 한 문장을 두세요." },
      { title: "기억 포인트에 이름 붙이기", body: "Chorus에서 반복하기 쉽고 검색하기 좋은 짧은 표현을 고르세요." },
    ],
  },
};

export default function PublicBibleFaq({ lang }: { lang: PublicFaqLocale }) {
  const copy = copyByLocale[lang];

  return (
    <section id="public-suno-starter" aria-labelledby="public-suno-starter-title" className="relative overflow-hidden bg-[#050505] px-4 pb-24 pt-8 text-zinc-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(255,106,0,0.13),transparent_30%),radial-gradient(circle_at_88%_0%,rgba(34,211,238,0.08),transparent_27%)]" />
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[1.55rem] border border-white/10 bg-black/58 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
        <header className="border-b border-white/10 px-5 pb-7 pt-20 sm:px-8 sm:py-7 lg:px-10 lg:py-9">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/[0.055] text-cyan-200"><BookOpenText className="h-5 w-5" /></span>
            <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.3em] text-cyan-200/75`}>{copy.eyebrow}</p>
          </div>
          <h2 id="public-suno-starter-title" className="mt-5 max-w-4xl text-[clamp(2rem,5vw,4.2rem)] font-black leading-[1.02] tracking-[-0.035em] text-white">{copy.title}</h2>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-zinc-400 sm:text-base sm:leading-8">{copy.body}</p>
        </header>

        <div className="grid gap-10 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:px-10 lg:py-10">
          <div>
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-5 w-5 text-orange-300" />
              <h3 className="text-xl font-black text-white">{copy.fieldTitle}</h3>
            </div>
            <div className="mt-5 grid gap-3">
              {SUNO_QUICK_START_FIELDS.map((field, index) => (
                <article key={field.key} className="rounded-[1.05rem] border border-white/9 bg-white/[0.025] p-4">
                  <div className="flex items-start gap-4">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${index === 1 ? "border-cyan-200/20 bg-cyan-300/[0.055] text-cyan-100" : "border-orange-300/20 bg-orange-400/[0.055] text-orange-100"}`}>0{index + 1}</span>
                    <div>
                      <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.2em] text-zinc-600`}>{field.eyebrow.split(" · ")[1]}</p>
                      <h4 className="mt-1 text-lg font-black text-white">{copy.fields[index].title}</h4>
                      <p className="mt-2 text-xs font-bold leading-6 text-zinc-500">{copy.fields[index].body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <h3 className="text-xl font-black text-white">{copy.faqTitle}</h3>
            </div>
            <div className="mt-5 grid gap-2">
              {PUBLIC_BIBLE_FAQ[lang].map((item, index) => (
                <details key={item.question} className="group rounded-[1rem] border border-white/9 bg-black/38 open:border-orange-300/22 open:bg-orange-400/[0.035]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-black text-zinc-200 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="text-[10px] font-black tabular-nums text-orange-300/65">0{index + 1}</span>
                    <span className="min-w-0 flex-1">{item.question}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-600 transition group-open:rotate-180 group-open:text-orange-200" />
                  </summary>
                  <p className="border-t border-white/8 px-4 py-4 pl-11 text-sm font-bold leading-7 text-zinc-400">{item.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 rounded-xl border border-amber-300/14 bg-amber-300/[0.035] px-4 py-3 text-xs font-bold leading-6 text-amber-100/70">{copy.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
