import "server-only";
import { bibleExpressionCardKey } from "./bible-prompt-copy.ts";
import { SUNO_EXPRESSION_MOVES, SUNO_EXPRESSION_TERMS } from "./suno-expression-prompts.ts";
import type { BibleCatalog } from "./ai-music-bible-content.ts";
import type { SunoLocalizedText } from "./suno-practice-library.ts";
import { SUNO_PROMPT_MOVES, SUNO_LYRIC_MOVES } from "./suno-practice-library.ts";
import type { SunoArtistDnaEntry, SunoPromptRecipe } from "./suno-inspiration-index.ts";
import { withBibleMetadata } from "./bible-metadata.ts";

const canonical = new Map(SUNO_EXPRESSION_MOVES.map(item => [item.key, item]));
const cardToCanonical = new Map(SUNO_EXPRESSION_MOVES.map(item => [bibleExpressionCardKey(item.key), item.key]));
const originalPrompts = new Map(SUNO_PROMPT_MOVES.map(item => [item.key, item]));
const originalLyrics = new Map(SUNO_LYRIC_MOVES.map(item => [item.key, item]));

function previewTechnique<T extends (typeof SUNO_PROMPT_MOVES)[number] | (typeof SUNO_LYRIC_MOVES)[number]>(item: T, original: T): T {
  const bodies = [item.copy.zh, item.copy.en, original.copy.zh, original.copy.en].filter(Boolean);
  const clean = (value: string, fallback: string) => bodies.some(body => value.includes(body)) ? (bodies.some(body => fallback.includes(body)) ? "Prompt" : fallback) : value;
  const title = { zh: clean(item.title.zh, original.title.zh), en: clean(item.title.en, original.title.en) };
  const summary = { zh: clean(item.summary.zh, original.summary.zh), en: clean(item.summary.en, original.summary.en) };
  return {
    key: item.key, category: item.category, title, summary,
    use: { zh: clean(item.use.zh, "依用途挑選，複製後查看完整 Prompt，再搭配自己的作品調整。"), en: clean(item.use.en, "Choose a direction, then copy to reveal the complete prompt and adapt it to your track.") },
    copy: { zh: "", en: "" }, evidence: original.evidence, sources: original.sources,
    metadata: withBibleMetadata(original).metadata,
    keywords: [title.zh, title.en, summary.zh, summary.en, item.category, original.studioFamily ?? ""],
    ...(original.studioFamily ? { studioFamily: original.studioFamily } : {}),
  } as T;
}

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
      if (!base) return previewTechnique(item, originalPrompts.get(item.key)!);
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
    lyricMoves: catalog.lyricMoves.map(item => previewTechnique(item, originalLyrics.get(item.key)!)),
  };
}

const previewEnglish: Record<string, string> = {
  "節奏藍調":"R&B", "嘻哈／饒舌":"Hip-hop", "鄉村／美式根源":"Country and roots", "金屬":"Metal", "龐克／硬蕊":"Punk", "搖滾":"Rock", "爵士":"Jazz", "藍調":"Blues", "靈魂／放克":"Soul and funk", "電子音樂":"Electronic", "民謠／原聲":"Acoustic folk", "古典／管弦":"Orchestral", "雷鬼／斯卡":"Reggae", "拉丁／巴薩諾瓦":"Latin", "福音／敬拜":"Gospel", "世界音樂":"Global sounds", "流行":"Pop", "跨界風格":"Crossover",
  "樂器／製作主導":"Production-led", "和聲／群唱":"Vocal ensemble", "強力高張力人聲":"Strong vocal presence", "沙啞顆粒人聲":"Textured voice", "柔滑細膩人聲":"Gentle voice", "女性主唱":"Female lead", "男性主唱":"Male lead", "敘事型人聲":"Narrative vocal",
  "吉他主導":"Guitar-led", "鋼琴／鍵盤主導":"Keyboard-led", "合成器電子編曲":"Electronic arrangement", "弦樂／管弦層次":"String layers", "節奏打擊主導":"Rhythm-led", "低頻律動主導":"Bass-led", "原聲器樂質感":"Acoustic color", "標誌性編曲":"Distinct arrangement",
  "暗黑氛圍":"Dark mood", "情感敘事":"Emotional story", "高能量副歌":"Energetic lift", "夢幻空間":"Dreamlike space", "年代復古質感":"Retro character", "鮮明作品氣質":"Distinct character",
  "深沉敘事口吻":"Low narrative voice", "有表情的沙啞人聲":"Grainy expressive voice", "柔和情感唱法":"Gentle lead vocal", "溫暖空氣感人聲":"Airy warmth", "絲滑靈魂樂句":"Fluid soulful voice",
  "溫暖夢幻光澤":"Dreamlike warmth", "振奮高能量":"Bright energy", "神祕電影氛圍":"Mysterious scene", "浪漫夜色情緒":"Nighttime romance", "憂鬱情感色調":"Reflective sadness",
  "輕柔打擊層次":"Light rhythmic layers", "柔和鋼琴和弦":"Gentle piano", "帶塵感電吉他":"Weathered guitar", "深沉低頻律動":"Deep low end", "溫暖復古合成器":"Retro synth color",
  "安靜告白":"A private confession", "雨天回憶":"Memories in rain", "城市夜行":"A walk through the city", "失落愛情":"Love and loss", "希望重生":"Renewed hope",
  "苦甜回望":"A bittersweet reflection", "久遠記憶":"A distant memory", "豁然開朗的瞬間":"A moment of clarity", "個人突破":"Personal growth",
  "玻璃感氛圍紋理":"Glasslike ambience", "黑色電影陰影質感":"A shadowy scene", "夕照薄霧氛圍":"Hazy evening light", "霧城市景氛圍":"A misty city",
  "寬幅電影全景":"Wide perspective", "溫暖類比色彩":"Analog character", "柔和黑膠質感":"Vintage surface", "空靈混響空間":"Open ambience", "親密乾淨近景":"An intimate perspective",
};
function englishDescription(zh: string) { return previewEnglish[zh] ?? "Creative direction"; }

/** Searchable descriptions only: English source tags also reconstruct paid DNA. */
export function previewArtistDna(entries: readonly SunoArtistDnaEntry[]): SunoArtistDnaEntry[] {
  return entries.map(item => ({
    key: item.key, artist: item.artist, source: item.source, sourcePage: item.sourcePage,
    summaryZh: item.summaryZh, tags: item.summaryZh.map(englishDescription), prompt: "",
    searchText: [item.artist, ...item.summaryZh, ...item.summaryZh.map(englishDescription)].join(" ").toLowerCase(),
    metadata: withBibleMetadata(item).metadata,
  }));
}
export function previewPromptRecipes(entries: readonly SunoPromptRecipe[]): SunoPromptRecipe[] {
  return entries.map(item => ({
    key: item.key, sourceIndex: item.sourceIndex, genre: item.genre, genreZh: item.genreZh,
    vocal: englishDescription(item.vocalZh), vocalZh: item.vocalZh,
    mood: englishDescription(item.moodZh), moodZh: item.moodZh,
    instrument: englishDescription(item.instrumentZh), instrumentZh: item.instrumentZh,
    story: englishDescription(item.storyZh), storyZh: item.storyZh,
    texture: englishDescription(item.textureZh), textureZh: item.textureZh, prompt: "",
    searchText: [item.genre, item.genreZh, item.vocalZh, item.moodZh, item.instrumentZh, item.storyZh, item.textureZh, ...[item.vocalZh,item.moodZh,item.instrumentZh,item.storyZh,item.textureZh].map(englishDescription)].join(" ").toLowerCase(),
    metadata: withBibleMetadata(item).metadata,
  }));
}
