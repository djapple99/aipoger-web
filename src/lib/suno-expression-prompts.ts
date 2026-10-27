import type { SunoExpressionFamily, SunoTechnique } from "./suno-practice-library.ts";

type ExpressionSpec = {
  term: string;
  family: Exclude<SunoExpressionFamily, "comparison">;
  zh: string;
  en: string;
  cue: string;
  noteZh: string;
  noteEn: string;
  preferred?: string;
  aliases?: string[];
};

/** All 46 entries from the two owner-supplied screenshots; related terms stay distinct. */
export const SUNO_EXPRESSION_TERMS: readonly ExpressionSpec[] = [
  { term: "Sotto voce", family: "vocal", zh: "低聲克制", en: "Understated voice", cue: "soft, understated vocal delivery", noteZh: "聽人聲是否收斂、靠近；不只比較播放音量，也不等於耳語。", noteEn: "Listen for restraint and intimacy, beyond playback level; it does not necessarily mean whispering." },
  { term: "Appassionato", family: "emotion", zh: "激情投入", en: "Impassioned", cue: "impassioned, emotionally committed delivery", noteZh: "適合情緒打開的樂句；投入程度不只靠音量判斷。", noteEn: "Useful for emotionally open phrases; assess commitment rather than loudness alone." },
  { term: "Marcato", family: "vocal", zh: "重音明確", en: "Marked accents", cue: "clearly accented vocal phrasing", noteZh: "聽字句起音與重音；不等於每個音都短的 Staccato。", noteEn: "Listen for marked attacks and accents; this is distinct from short, detached staccato notes." },
  { term: "Giocoso", family: "character", zh: "俏皮歡快", en: "Playful", cue: "playful, light-hearted performance", noteZh: "適合有笑意、輕巧互動的段落；可與 Furioso 做氛圍比較。", noteEn: "Try a playful, smiling character; contrast with Furioso as a mood demonstration." },
  { term: "Furioso", family: "emotion", zh: "狂怒爆發", en: "Furious", cue: "furious, agitated and intense performance", noteZh: "適合憤怒或失控的戲劇張力；不必把它簡化成大叫。", noteEn: "Try furious dramatic tension without assuming that shouting is required." },
  { term: "Cantabile", family: "vocal", zh: "如歌般流暢", en: "Singing line", cue: "flowing, lyrical phrasing", noteZh: "人聲或樂器都可用；如歌的樂句不代表一定要唱成歌劇。", noteEn: "Works as a direction for voices or instruments; a singing line does not require an operatic style." },
  { term: "Dolce", family: "vocal", zh: "甜美柔和", en: "Sweet and gentle", cue: "sweet, gentle vocal tone", noteZh: "適合柔和抒情段落；不限定歌手性別或音域。", noteEn: "Try gentle lyrical passages without prescribing a singer's gender or range." },
  { term: "Espressivo", family: "vocal", zh: "富有表情", en: "Expressive", cue: "expressive phrasing with emotional inflection", noteZh: "聽樂句的情緒起伏；可指定要作用在人聲或主旋律樂器。", noteEn: "Listen for expressive shaping; specify whether the voice or lead instrument should carry it." },
  { term: "Leggiero", family: "vocal", zh: "輕盈細緻", en: "Light and delicate", cue: "light, delicate articulation", noteZh: "重點是觸感與起音的輕巧，不等於加快 BPM。", noteEn: "Focus on lightness of touch and articulation rather than increasing BPM." },
  { term: "Sostenuto", family: "vocal", zh: "持續延展", en: "Sustained", cue: "sustained notes and long, supported phrases", noteZh: "聽長音與樂句如何延展；與穩定節拍、效果器延音分開使用。", noteEn: "Listen for sustained notes and supported phrases; treat steady tempo and sustain effects as separate choices." },
  { term: "Affettuoso", family: "emotion", zh: "溫柔深情", en: "Affectionate", cue: "tender, affectionate vocal expression", noteZh: "適合溫暖的告白或關懷語氣；可保留克制的力度。", noteEn: "Try warmth and affection in a love song or caring line while keeping the delivery restrained." },
  { term: "Agitato", family: "emotion", zh: "激動不安", en: "Agitated", cue: "agitated, restless emotional character", noteZh: "用在焦躁與不安的段落；指定情緒，別只靠加速。", noteEn: "Try anxiety and restlessness as an emotional direction, rather than relying on speed alone." },
  { term: "Con amore", family: "emotion", zh: "帶著愛意", en: "With love", cue: "warm, loving expression", noteZh: "適合親密、關懷的表情，不必自動增加氣聲或混響。", noteEn: "Try a loving, intimate expression without automatically adding breathiness or reverb." },
  { term: "Doloroso", family: "emotion", zh: "悲痛哀傷", en: "Sorrowful", cue: "sorrowful, pained emotional expression", noteZh: "聽悲傷如何進入樂句；與音色暗、速度慢分開判斷。", noteEn: "Listen for sorrow in the phrasing, separately from dark timbre or slow tempo." },
  { term: "Drammatico", family: "emotion", zh: "戲劇張力", en: "Dramatic", cue: "dramatic expression with emotional contrast", noteZh: "適合故事轉折與衝突；可指定哪一段要放大對比。", noteEn: "Try dramatic turns and conflicts, specifying the section that needs more contrast." },
  { term: "Feroce", family: "emotion", zh: "兇猛凌厲", en: "Fierce", cue: "fierce, forceful expression", noteZh: "適合帶威脅感或凌厲的演出；和狂怒失控的 Furioso 保留區別。", noteEn: "Try a fierce or threatening character, distinct from Furioso's raging agitation." },
  { term: "Lacrimoso", family: "emotion", zh: "含淚哀訴", en: "Tearful", cue: "tearful, plaintive expression", noteZh: "用來描述含淚、哀訴的表情；適合情緒收斂的悲傷樂句。", noteEn: "Describe a tearful, plaintive expression for a restrained sorrowful phrase." },
  { term: "Misterioso", family: "emotion", zh: "神祕莫測", en: "Mysterious", cue: "mysterious, veiled atmosphere", noteZh: "適合神祕、懸而未解的氣氛；需要時另寫樂器與空間描述。", noteEn: "Try a mysterious, unresolved atmosphere; specify instruments and space separately when needed." },
  { term: "Solitario", family: "emotion", zh: "孤獨寂寥", en: "Solitary", cue: "solitary, introspective mood", noteZh: "孤獨是情緒方向，不等於一定要獨唱、無伴奏或全曲小調。", noteEn: "Solitude is a mood, not a requirement for solo vocals, a cappella or a minor key throughout." },
  { term: "Tranquillo", family: "emotion", zh: "恬靜平和", en: "Calm", cue: "calm, peaceful emotional character", noteZh: "先聽情緒是否放鬆；平靜的歌曲也可以保留律動。", noteEn: "Listen for emotional calm; a tranquil song can still have a groove." },
  { term: "Animato", family: "energy", zh: "生動活躍", en: "Animated", cue: "animated, lively forward motion", noteZh: "適合增加演出的活力；不把它當成固定速度指令。", noteEn: "Try a more animated performance without treating the word as an exact tempo command." },
  { term: "Brioso", family: "energy", zh: "生氣勃勃", en: "Spirited", cue: "spirited, vigorous performance", noteZh: "聽樂句的精神與動能；和 Con brio 是相關用語，各自保留查找。", noteEn: "Listen for spirit and vigour; retain this alongside the related phrase Con brio." },
  { term: "Celere", family: "energy", zh: "迅捷敏捷", en: "Swift", cue: "swift, nimble musical motion", noteZh: "要固定速度時另外寫 BPM；迅捷也可能表現在音符活動。", noteEn: "Specify BPM separately for a fixed tempo; swiftness may also affect the activity within phrases." },
  { term: "Con brio", family: "energy", zh: "充滿活力", en: "With vigour", cue: "vigorous, spirited forward drive", noteZh: "適合有精神的推進感；不等於無限制加大音量。", noteEn: "Try spirited momentum rather than simply increasing overall loudness." },
  { term: "Con forza", family: "energy", zh: "帶著力量", en: "With force", cue: "forceful, strong musical delivery", noteZh: "可指定在人聲、鼓組或主旋律上施力，不必全曲一起變重。", noteEn: "Specify whether the voice, drums or lead melody should carry the force." },
  { term: "Con fuoco", family: "energy", zh: "熱烈如火", en: "With fire", cue: "fiery, ardent performance", noteZh: "適合熱烈的情緒與動能；可與 Con forza 的直接力量比較。", noteEn: "Try fiery passion and energy, contrasting it with the more direct force of Con forza." },
  { term: "Con moto", family: "energy", zh: "帶著動感", en: "With motion", cue: "a sense of motion and forward momentum", noteZh: "重點是持續推進，不等於像 Accelerando 一直加速。", noteEn: "Aim for forward motion rather than a continuous accelerando." },
  { term: "Con spirito", family: "energy", zh: "精神飽滿", en: "With spirit", cue: "spirited, energetic musical character", noteZh: "適合有精神、有生命力的演出；先和原版本比較。", noteEn: "Try a spirited, lively performance and compare it with the unchanged version." },
  { term: "Energico", family: "energy", zh: "精力充沛", en: "Energetic", cue: "energetic, vigorous delivery", noteZh: "適合需要明確動能的段落；不是音質或母帶響度的指令。", noteEn: "Try greater performance energy; this is not a command for audio quality or mastering loudness." },
  { term: "Slancio", preferred: "Con slancio", family: "energy", zh: "奔放衝勁", en: "Impetuous drive", cue: "impetuous, forward-driving momentum", noteZh: "常見搭配是 Con slancio；重點是帶衝勁地向前，不只泛稱熱情。", noteEn: "Often phrased Con slancio: impetuous forward drive, rather than passion in general.", aliases: ["con slancio"] },
  { term: "Brillante", family: "character", zh: "明亮燦爛", en: "Brilliant", cue: "brilliant, sparkling musical character", noteZh: "描述演出的明亮與光彩，不等於把高頻 EQ 拉高。", noteEn: "Describe brilliance of character rather than automatically boosting treble EQ." },
  { term: "Bruscamente", family: "character", zh: "突然唐突", en: "Abruptly", cue: "abrupt, brusque musical gestures", noteZh: "適合唐突的起音或轉折；要做段落切換時，可放在相應的段落標籤旁。", noteEn: "Use for abrupt attacks or turns; place beside the appropriate section label for a transition." },
  { term: "Buffo", family: "character", zh: "滑稽幽默", en: "Comic", cue: "comic, humorous performance character", noteZh: "適合喜劇性的角色表演；不代表一定要加入笑聲音效。", noteEn: "Try a comic character without assuming literal laughter sound effects." },
  { term: "Colossale", family: "character", zh: "宏大龐然", en: "Colossal", cue: "colossal scale and monumental musical weight", noteZh: "偏向整體規模與重量；要合唱或大編制仍需另外指定。", noteEn: "Describe monumental scale; specify a choir or large ensemble separately if wanted." },
  { term: "Comodo", family: "character", zh: "從容舒適", en: "Comfortable", cue: "comfortable, unhurried musical flow", noteZh: "重點是從容合宜的行進感；要控制速度時再搭配 BPM。", noteEn: "Aim for a comfortable flow rather than a particular BPM." },
  { term: "Con grazia", family: "character", zh: "優雅地演出", en: "With grace", cue: "graceful, poised musical delivery", noteZh: "優雅不必然含蓄；可以保留清楚的線條和表情。", noteEn: "Grace does not necessarily mean restraint; clear lines and expression can remain." },
  { term: "Festoso", family: "character", zh: "喜慶歡樂", en: "Festive", cue: "festive, celebratory character", noteZh: "適合慶祝氣氛；和 Giocoso 的俏皮、Scherzando 的嬉戲分開選。", noteEn: "Try a celebratory atmosphere, distinct from playful Giocoso or jesting Scherzando." },
  { term: "Grandioso", family: "character", zh: "宏偉壯麗", en: "Grand", cue: "grand, expansive musical expression", noteZh: "可用在大開大闔的編曲或樂句；不只指唱得大聲。", noteEn: "Try expansive arrangements or phrases rather than loud singing alone." },
  { term: "Grazioso", family: "character", zh: "優美輕巧", en: "Graceful", cue: "graceful, elegant musical character", noteZh: "適合優美靈巧的表情；與 Con grazia 一併保留。", noteEn: "Try an elegant, graceful character; retain it alongside Con grazia." },
  { term: "Maestoso", family: "character", zh: "莊嚴堂皇", en: "Majestic", cue: "majestic, stately and dignified phrasing", noteZh: "聽莊重與氣度；和 Grandioso 的壯麗、Pesante 的重量分開判斷。", noteEn: "Listen for dignity and stateliness, distinct from grandeur or heavy weight." },
  { term: "Pesante", family: "character", zh: "沉重厚實", en: "Heavy", cue: "heavy, weighty musical articulation", noteZh: "可描述音符的重量與步伐；不等於增加低頻或失真。", noteEn: "Describe weight in articulation and pacing, rather than automatically adding bass or distortion." },
  { term: "Risoluto", family: "character", zh: "堅定果斷", en: "Resolute", cue: "resolute, decisive musical phrasing", noteZh: "適合有決心的敘事與收束；不必同時變兇或變快。", noteEn: "Try decisiveness in a line or ending without requiring aggression or faster tempo." },
  { term: "Scherzando", family: "character", zh: "嬉戲詼諧", en: "Jesting", cue: "jesting, playful musical gestures", noteZh: "適合帶玩笑感的互動與轉折；可和較直白歡快的 Giocoso 比較。", noteEn: "Try jesting interplay and turns, comparing it with a more directly playful Giocoso." },
  { term: "Semplicemente", family: "character", zh: "簡單自然", en: "Simply", cue: "simple, unaffected musical expression", noteZh: "重點是自然不造作；想減少樂器時，另外指定精簡編曲。", noteEn: "Aim for an unaffected expression; fewer instruments are a separate arrangement choice.", aliases: ["semplice"] },
  { term: "Sonore", preferred: "Sonoro", family: "character", zh: "飽滿共鳴", en: "Full-toned", cue: "full-toned, resonant sound", noteZh: "保留原圖 Sonore，也收錄 Sonoro 查找；重點是共鳴與飽滿，不只響亮。", noteEn: "Keep the screenshot's Sonore and index Sonoro as well; focus on resonance and fullness, not loudness alone.", aliases: ["sonoro", "sonorous"] },
  { term: "Volante", family: "character", zh: "飛舞輕盈", en: "Flying lightness", cue: "flying, light and agile musical motion", noteZh: "適合飛舞般的線條與靈巧感；若要特定音域、節奏仍需另寫。", noteEn: "Try flying, agile lines; specify register and rhythm separately when important." },
];

export const SUNO_EXPRESSION_REFERENCE_URLS = [
  "https://www.dolmetsch.com/musictheory21.htm",
  "https://www.dolmetsch.com/defss3.htm",
  "https://help.suno.com/en/articles/9010177",
] as const;

const experimental = () => ({ platform: "Suno", model: null, modelVersion: null, lastVerifiedAt: null, status: "Experimental" as const });
const source = ["使用者提供的兩張音樂表情術語截圖・46 詞", "詞義參考 Dolmetsch；描述原則參考 Suno Music Glossary，詞義與使用方式整理"];

export const SUNO_EXPRESSION_BASE_STYLE = "Mandarin pop, 90 BPM, C major, solo male lead vocal, piano, bass and light drums, short verse and chorus, lead vocal prominent in the mix.";

export const SUNO_EXPRESSION_COMPARISON_MOVES: SunoTechnique<"expression">[] = [
  {
    key: "expression-control-a", category: "expression", expressionFamily: "comparison",
    title: { zh: "A 組｜不加表情詞的基準", en: "A · unchanged baseline" },
    summary: { zh: "先保存原版本，讓 B、C 都有同一個比較起點。", en: "Save an unchanged baseline for both B and C." },
    use: { zh: "放在 Style，三組使用相同歌詞與同一模型、BPM、調性、人聲及滑桿設定。介面可用時先關閉 Variety／個人口味改寫。每組保留多個版本；輪流聽各組的起音、樂句、重音和情緒，避免只比較音量。", en: "Use in Style with identical lyrics, model, BPM, key, vocal setup and sliders. Where available, turn off Variety/personalized rewriting. Keep multiple renders. Compare attacks, phrasing, accents and emotion across the groups, beyond playback loudness." },
    copy: { zh: SUNO_EXPRESSION_BASE_STYLE, en: SUNO_EXPRESSION_BASE_STYLE },
    evidence: "version", metadata: experimental(), sources: source, keywords: ["對照", "基準", "A/B", "A/B/C", "baseline", "control", "表情詞"],
  },
  {
    key: "expression-control-b", category: "expression", expressionFamily: "comparison",
    title: { zh: "B 組｜只加 Sotto voce 原詞", en: "B · add only Sotto voce" },
    summary: { zh: "只比 A、B 的差異，先不要加入英文情緒解釋。", en: "Compare A with B before adding an English interpretation." },
    use: { zh: "放在 Style，維持 A 的歌詞與所有設定；只加 Vocal delivery: sotto voce。先聽句子是否更收斂、起音與表情是否改變，和單純播放音量變小分開記錄。不挑最像的一版當作唯一證據。", en: "Use in Style, retaining A's lyrics and settings. Add only Vocal delivery: sotto voce. Compare restraint, attacks and expression separately from playback loudness; do not cherry-pick a single convincing render." },
    copy: { zh: `Vocal delivery: sotto voce. ${SUNO_EXPRESSION_BASE_STYLE}`, en: `Vocal delivery: sotto voce. ${SUNO_EXPRESSION_BASE_STYLE}` },
    evidence: "version", metadata: experimental(), sources: source, keywords: ["對照", "原詞", "Sotto voce", "A/B", "A/B/C", "Italian only", "control"],
  },
  {
    key: "expression-control-c", category: "expression", expressionFamily: "comparison",
    title: { zh: "C 組｜原詞加英文唱法描述", en: "C · term plus English direction" },
    summary: { zh: "比較 B、C，觀察具體英文補充能否讓方向更清楚。", en: "Compare B with C to explore the contribution of concrete English wording." },
    use: { zh: "放在 Style，保留 B 的條件，再加 soft, understated vocal delivery。若 C 的反差較明顯，記錄成「原詞＋英文描述」的效果，不歸因於義大利原詞本身。想做單段唱法可另外測 [Verse - Sotto voce]，但不要在同輪同時更換欄位與情緒。", en: "Use in Style with B's conditions, adding soft, understated vocal delivery. If C differs more, attribute the observation to the combined description, not the Italian word alone. A separate section-level test may use [Verse - Sotto voce]; do not change field placement and emotion together in this comparison." },
    copy: { zh: `Vocal delivery: sotto voce, soft, understated vocal delivery. ${SUNO_EXPRESSION_BASE_STYLE}`, en: `Vocal delivery: sotto voce, soft, understated vocal delivery. ${SUNO_EXPRESSION_BASE_STYLE}` },
    evidence: "version", metadata: experimental(), sources: source, keywords: ["對照", "英文補充", "Sotto voce", "A/B", "A/B/C", "English description", "control"],
  },
];

export const SUNO_EXPRESSION_MOVES: SunoTechnique<"expression">[] = [
  ...SUNO_EXPRESSION_TERMS.map((spec): SunoTechnique<"expression"> => {
    const phrase = `${spec.preferred ?? spec.term}, ${spec.cue}.`;
    return {
      key: `expression-${spec.term.toLowerCase().replace(/\s+/g, "-")}`,
      category: "expression", expressionFamily: spec.family,
      title: { zh: `${spec.term}｜${spec.zh}`, en: `${spec.term} · ${spec.en}` },
      summary: { zh: spec.noteZh, en: spec.noteEn },
      use: { zh: `放在 Style，指定作用在人聲或樂器，再搭配既有曲風與編曲。${spec.zh}是表演方向；這段英文是建議描述，先用 A／B／C 方法比較。`, en: `Use in Style, specifying the voice or instrument, alongside your existing genre and arrangement. ${spec.en} is a performance direction; this English wording is a suggested interpretation. Compare it with the A/B/C method.` },
      copy: { zh: phrase, en: phrase }, evidence: "version", metadata: experimental(), sources: source,
      keywords: [spec.term, spec.preferred ?? spec.term, spec.zh, spec.en, ...(spec.aliases ?? []), "表情詞", "音樂術語", "義大利文", "表情與氛圍", "expression", "Italian", "mood", spec.family],
    };
  }),
  ...SUNO_EXPRESSION_COMPARISON_MOVES,
];
