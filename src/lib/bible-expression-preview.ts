import "server-only";
import { bibleExpressionCardKey } from "./bible-prompt-copy.ts";
import { SUNO_EXPRESSION_MOVES, SUNO_EXPRESSION_TERMS } from "./suno-expression-prompts.ts";
import type { BibleCatalog } from "./ai-music-bible-content.ts";
import type { SunoLocalizedText } from "./suno-practice-library.ts";

const canonical = new Map(SUNO_EXPRESSION_MOVES.map(item => [item.key, item]));
const cardToCanonical = new Map(SUNO_EXPRESSION_MOVES.map(item => [bibleExpressionCardKey(item.key), item.key]));

/** Accept legacy paid operations too; the database continues using its original keys. */
export function canonicalExpressionKey(value: unknown): string | null {
  return typeof value === "string" ? cardToCanonical.get(value) ?? (canonical.has(value) ? value : null) : null;
}

const aliases = SUNO_EXPRESSION_TERMS.flatMap(spec =>
  [spec.term, spec.preferred, ...(spec.aliases ?? [])].filter((term): term is string => Boolean(term))
    .map(term => ({ term, title: { zh: spec.zh, en: spec.en } })),
).sort((a, b) => b.term.length - a.term.length);

function descriptiveNote(note: string, locale: "zh" | "en") {
  for (const { term, title } of aliases) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    note = note.replace(new RegExp(`\\b${escaped}\\b`, "gi"), title[locale]);
  }
  return note
    .replace(/\bstaccato\b/gi, locale === "zh" ? "斷奏" : "detached notes")
    .replace(/\baccelerando\b/gi, locale === "zh" ? "逐漸加速" : "gradual acceleration");
}

const comparisonTitles: SunoLocalizedText[] = [
  { zh: "A 組｜原始基準", en: "A · unchanged baseline" },
  { zh: "B 組｜加入唱法提示", en: "B · add a delivery cue" },
  { zh: "C 組｜補充表現細節", en: "C · add delivery detail" },
];

/** An explicit preview allowlist: overrides and future fields cannot leak paid text. */
export function previewBibleCatalog(catalog: BibleCatalog): BibleCatalog {
  return {
    ...catalog,
    promptMoves: catalog.promptMoves.map(item => {
      const base = canonical.get(item.key);
      if (!base) return item;
      const index = SUNO_EXPRESSION_MOVES.findIndex(move => move.key === item.key);
      const spec = SUNO_EXPRESSION_TERMS[index];
      const title = spec ? { zh: spec.zh, en: spec.en } : comparisonTitles[index - SUNO_EXPRESSION_TERMS.length];
      const summary = spec
        ? { zh: descriptiveNote(spec.noteZh, "zh"), en: descriptiveNote(spec.noteEn, "en") }
        : base.summary;
      if (spec?.term === "Slancio") { summary.zh = "重點是帶著衝勁向前，不只泛稱熱情。"; summary.en = "Aim for impetuous forward drive rather than passion in general."; }
      if (spec?.term === "Sonore") { summary.zh = "重點是共鳴與飽滿，不只響亮。"; summary.en = "Focus on resonance and fullness, beyond loudness alone."; }
      return {
        key: bibleExpressionCardKey(item.key), category: "expression", expressionFamily: base.expressionFamily,
        title, summary,
        use: { zh: "放在 Style，搭配自己的曲風、人聲與編曲；比較時保留相同歌詞和設定。複製後即可查看完整 Prompt。", en: "Use in Style with your genre, voice and arrangement. Keep lyrics and settings consistent when comparing. Copy to reveal the complete prompt." },
        copy: { zh: "", en: "" }, evidence: base.evidence, metadata: base.metadata,
        sources: base.sources,
        keywords: [title.zh, title.en, "表情", "氛圍", "唱法", "expression", "mood", "delivery", base.expressionFamily ?? ""],
      };
    }),
  };
}
