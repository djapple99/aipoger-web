import { SUNO_STUDIO_MASTERING_MOVES } from "./suno-studio-mastering-prompts.ts";

export type SunoLibraryLocale = "zh" | "en";

export type SunoLocalizedText = {
  zh: string;
  en: string;
};

export type SunoEvidence = "official" | "field" | "version";

export type SunoPromptCategory =
  | "foundation"
  | "workflow"
  | "dance"
  | "production"
  | "mastering"
  | "theory"
  | "recipe";

export type SunoStudioMasteringFamily =
  | "electronic"
  | "hip-hop"
  | "soul-rnb"
  | "new-age-ambient"
  | "rock-roll"
  | "indie-dance"
  | "disco-funk"
  | "jazz-bossa"
  | "pop"
  | "classical-cinematic"
  | "latin-caribbean"
  | "african-amapiano"
  | "asian-middle-eastern"
  | "country-folk"
  | "dj-edit";

export type SunoLyricCategory =
  | "structure"
  | "formatting"
  | "vocal"
  | "emotion"
  | "duet"
  | "atmosphere";

export type SunoTechnique<Category extends string> = {
  key: string;
  category: Category;
  title: SunoLocalizedText;
  summary: SunoLocalizedText;
  use: SunoLocalizedText;
  copy: SunoLocalizedText;
  evidence: SunoEvidence;
  sources: string[];
  keywords: string[];
  studioFamily?: SunoStudioMasteringFamily;
};

export type SunoGenreGroup = {
  key: string;
  label: SunoLocalizedText;
  terms: string[];
};

export const SUNO_PROMPT_CATEGORIES: { key: SunoPromptCategory | "all"; label: SunoLocalizedText }[] = [
  { key: "all", label: { zh: "全部", en: "All" } },
  { key: "foundation", label: { zh: "核心公式", en: "Core formula" } },
  { key: "workflow", label: { zh: "生成工作流", en: "Workflow" } },
  { key: "dance", label: { zh: "舞曲能量", en: "Dance energy" } },
  { key: "production", label: { zh: "音色與混音", en: "Sound & mix" } },
  { key: "mastering", label: { zh: "錄音室 Mastering", en: "Studio mastering" } },
  { key: "theory", label: { zh: "調性與節奏", en: "Key & rhythm" } },
  { key: "recipe", label: { zh: "愛波哥配方", en: "AIPOGER recipes" } },
];

export const SUNO_STUDIO_MASTERING_FAMILY_OPTIONS: { key: SunoStudioMasteringFamily | "all"; label: SunoLocalizedText }[] = [
  { key: "all", label: { zh: "全部錄音室", en: "All studios" } },
  { key: "electronic", label: { zh: "電子音樂", en: "Electronic" } },
  { key: "hip-hop", label: { zh: "Hip-Hop", en: "Hip-Hop" } },
  { key: "soul-rnb", label: { zh: "Soul & R&B", en: "Soul & R&B" } },
  { key: "new-age-ambient", label: { zh: "New Age & Ambient", en: "New Age & Ambient" } },
  { key: "rock-roll", label: { zh: "Rock & Roll", en: "Rock & Roll" } },
  { key: "indie-dance", label: { zh: "Indie Dance", en: "Indie Dance" } },
  { key: "disco-funk", label: { zh: "Disco & Funk", en: "Disco & Funk" } },
  { key: "jazz-bossa", label: { zh: "Jazz & Bossa", en: "Jazz & Bossa" } },
  { key: "pop", label: { zh: "Pop", en: "Pop" } },
  { key: "classical-cinematic", label: { zh: "Classical & Cinematic", en: "Classical & Cinematic" } },
  { key: "latin-caribbean", label: { zh: "Latin & Caribbean", en: "Latin & Caribbean" } },
  { key: "african-amapiano", label: { zh: "African & Amapiano", en: "African & Amapiano" } },
  { key: "asian-middle-eastern", label: { zh: "Asian & Middle Eastern", en: "Asian & Middle Eastern" } },
  { key: "country-folk", label: { zh: "Country & Folk", en: "Country & Folk" } },
  { key: "dj-edit", label: { zh: "DJ Edit／Extended", en: "DJ Edit / Extended" } },
];

export const SUNO_LYRIC_CATEGORIES: { key: SunoLyricCategory | "all"; label: SunoLocalizedText }[] = [
  { key: "all", label: { zh: "全部", en: "All" } },
  { key: "structure", label: { zh: "段落結構", en: "Structure" } },
  { key: "formatting", label: { zh: "歌詞符號", en: "Formatting" } },
  { key: "vocal", label: { zh: "唱法與音色", en: "Vocal delivery" } },
  { key: "emotion", label: { zh: "情緒表演", en: "Emotion" } },
  { key: "duet", label: { zh: "合唱與互動", en: "Duet & interplay" } },
  { key: "atmosphere", label: { zh: "環境與特效", en: "Atmosphere & SFX" } },
];

const SUNO_CORE_PROMPT_MOVES: SunoTechnique<SunoPromptCategory>[] = [
  {
    key: "prompt-dna",
    category: "foundation",
    title: { zh: "七格聲音 DNA", en: "Seven-part sonic DNA" },
    summary: { zh: "先把 Style 欄拆成曲風、情緒、樂器、速度、調性與質感，避免只丟一串空泛形容詞。", en: "Build the Style field from genre, mood, instruments, tempo, key, and texture instead of a vague adjective pile." },
    use: { zh: "從零開始定義一首歌時", en: "When defining a song from scratch" },
    copy: { zh: "[主曲風], [次曲風], [情緒／能量], [主要樂器], [BPM], [調／音階], [混音質感]", en: "[Primary genre], [Secondary genre], [Mood/Energy], [Key instruments], [BPM], [Key/Scale], [Mix texture]" },
    evidence: "field",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["style", "genre", "bpm", "key", "texture", "公式"],
  },
  {
    key: "prompt-focus",
    category: "foundation",
    title: { zh: "主曲風先站穩，修飾再進場", en: "Anchor first, modifiers second" },
    summary: { zh: "先用一個主曲風當引擎，再把一至兩個風格寫成材質或節奏修飾。少而準比曲風名稱排隊更容易形成清楚方向。", en: "Use one genre as the engine, then turn one or two additional styles into texture or rhythm modifiers. A clear hierarchy beats a queue of genre names." },
    use: { zh: "結果混濁、風格互相打架時", en: "When the result feels unfocused or contradictory" },
    copy: { zh: "[主曲風] with subtle [修飾風格] textures, [決定性節奏], [核心樂器與作用], [情緒]", en: "[Anchor genre] with subtle [modifier style] textures, [defining groove], [key instrument + role], [emotional frame]" },
    evidence: "field",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual", "NuNaught Suno Prompting Guide"],
    keywords: ["front load", "less", "衝突", "權重", "anchor", "modifier", "主曲風"],
  },
  {
    key: "two-field-routing",
    category: "foundation",
    title: { zh: "Style 管聲音，Lyrics 管演出", en: "Route sound and performance to separate fields" },
    summary: { zh: "Style 欄定義曲風、人聲身份、樂器角色、空間與能量弧線；Lyrics 欄放歌詞、段落與就近表演提示。兩欄不要重複講完整故事。", en: "Use Style for genre, vocal identity, instrument roles, space, and energy arc. Keep lyrics, sections, and local performance cues in Lyrics without repeating the whole story in both fields." },
    use: { zh: "Prompt 很長，但聲音與段落仍互相干擾時", en: "When a long prompt still confuses sound and section behavior" },
    copy: { zh: "Style：主曲風＋人聲身份＋樂器角色＋製作空間＋編曲弧線＋一句主題\nLyrics：[段落 - 動態, 唱法]\n（實際歌詞）", en: "Style: anchor genre + vocal identity + instrument roles + production space + arrangement arc + one-line premise\nLyrics: [Section - movement, delivery]\n(actual lyric)" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill", "Suno Custom Mode"],
    keywords: ["style field", "lyrics field", "two field", "分工", "兩欄", "premise"],
  },
  {
    key: "vocal-identity-stack",
    category: "production",
    title: { zh: "人聲身份四層疊法", en: "Four-layer vocal identity" },
    summary: { zh: "不要只寫男聲、女聲或好聽。用音域、音色、咬字／句法與處理方式建立角色；需要時再補上主歌到副歌的變化。", en: "Go beyond male, female, or beautiful. Define range, timbre, delivery behavior, and processing, then add a verse-to-chorus arc when needed." },
    use: { zh: "每次生成的歌手個性差太多，或副歌沒有抬升時", en: "When the singer changes too much between generations or the chorus never lifts" },
    copy: { zh: "[音域] [音色] lead, [咬字／句法], [處理方式]; verses [收斂狀態], final chorus [放大狀態]", en: "[Range] [timbre] lead, [diction/phrasing], [processing]; restrained in verses, expanding into the final chorus" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill", "Suno Music Glossary"],
    keywords: ["vocal identity", "range", "timbre", "diction", "processing", "vocal arc", "音域", "音色"],
  },
  {
    key: "instrument-role-map",
    category: "production",
    title: { zh: "樂器要有工作，不只報名字", en: "Give every instrument a job" },
    summary: { zh: "樂器名稱後面接作用：帶脈衝、穩住 Groove、鋪和聲、回答人聲、做記憶 Hook 或製造撞擊。模型會比看到純清單更知道誰該站前面。", en: "Pair each instrument with a function: carry the pulse, anchor the groove, form the harmonic bed, answer the vocal, create a hook, or deliver impact. Roles give the palette hierarchy." },
    use: { zh: "樂器都有出現，編曲卻像同時搶話時", en: "When the right instruments appear but all compete for attention" },
    copy: { zh: "[樂器 A] carries the pulse, [樂器 B] cushions the vocal, [樂器 C] answers chorus lines, [低頻樂器] anchors the groove", en: "[Instrument A] carries the pulse, [Instrument B] cushions the vocal, [Instrument C] answers chorus lines, [Low-end instrument] anchors the groove" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill", "Suno Music Glossary"],
    keywords: ["instrument role", "pulse carrier", "groove anchor", "harmonic bed", "counterline", "impact", "樂器角色"],
  },
  {
    key: "section-density-arc",
    category: "production",
    title: { zh: "用密度推動整首歌", en: "Move the song with section density" },
    summary: { zh: "主歌先留空間，Pre-Chorus 增加上升訊號，副歌拓寬聲部，Bridge 抽掉大部分元素，Final Chorus 再把前面累積的層次一次打開。", en: "Leave space in the verse, add lift in the pre-chorus, widen the chorus, strip the bridge, then release the accumulated layers in the final chorus." },
    use: { zh: "段落都有了，但從頭到尾像同一個平面時", en: "When every section exists but the arrangement stays flat" },
    copy: { zh: "Verse: pulse carrier + harmonic bed, sparse\nPre-Chorus: rising bass + widening harmony\nChorus: full drums + hook double + counterline\nBridge: voice + one contrast color\nFinal Chorus: harmony stack + brighter hook + wider drums", en: "Verse: pulse carrier + harmonic bed, sparse\nPre-Chorus: rising bass + widening harmony\nChorus: full drums + hook double + counterline\nBridge: voice + one contrast color\nFinal Chorus: harmony stack + brighter hook + wider drums" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill", "Suno Music Glossary"],
    keywords: ["density", "arrangement arc", "verse", "pre-chorus", "bridge", "final chorus", "密度", "編曲弧線"],
  },
  {
    key: "fusion-four-part",
    category: "foundation",
    title: { zh: "跨界融合四件組", en: "Four-part fusion builder" },
    summary: { zh: "跨曲風不是把名稱全部相乘。先選主引擎，再放一個反差色彩，用共同節奏／旋律功能接橋，最後指定能把兩邊黏起來的製作質感。", en: "Fusion is not genre-name multiplication. Choose an engine, one contrast color, a shared musical bridge, and a production binder that makes both sides inhabit one record." },
    use: { zh: "民族樂器＋電子、古典＋Trap 等跨界結果像拼貼時", en: "When world-electronic, orchestral-trap, or other hybrids sound pasted together" },
    copy: { zh: "Anchor：[主 Groove／曲風引擎]\nContrast：[反差樂器／傳統色彩]\nBridge：[共同功能：drone／ostinato／call-and-response／hand percussion]\nBinder：[tape warmth／club sub／cinematic reverb／close-room realism]", en: "Anchor: [main groove/genre engine]\nContrast: [unexpected instrument/tradition color]\nBridge: [shared function: drone/ostinato/call-and-response/hand percussion]\nBinder: [tape warmth/club sub/cinematic reverb/close-room realism]" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill"],
    keywords: ["fusion", "anchor", "contrast", "bridge mechanism", "production binder", "跨界", "融合"],
  },
  {
    key: "creative-sliders",
    category: "foundation",
    title: { zh: "Creative Sliders 起手式", en: "Creative Sliders starting point" },
    summary: { zh: "官方確認 Weirdness 控制 Safe 到 Chaos，Style Influence 控制 Loose 到 Strong；教材中的百分比應當作測試起點。", en: "Suno documents Weirdness from Safe to Chaos and Style Influence from Loose to Strong. Treat the guide percentages as test starts." },
    use: { zh: "要重現曲風或做跨界實驗時", en: "For faithful genre work or experimental fusion" },
    copy: { zh: "穩定重現：Weirdness 20–35%／Style 90–100%\n平衡融合：Weirdness 40–50%／Style 70–85%", en: "Stable recreation: Weirdness 20–35% / Style 90–100%\nBalanced fusion: Weirdness 40–50% / Style 70–85%" },
    evidence: "official",
    sources: ["Suno Creative Sliders", "愛波哥的 Suno 聖經 2026 V1"],
    keywords: ["weirdness", "style influence", "slider", "隨機性"],
  },
  {
    key: "instrumental-first",
    category: "workflow",
    title: { zh: "先蓋骨架，再讓歌手進場", en: "Build the instrumental first" },
    summary: { zh: "舞曲先用 Instrumental 與段落標籤確認能量曲線，再透過 Extend、Add Vocals 或編輯工具加入歌詞。", en: "For dance music, validate the energy map in Instrumental mode before adding lyrics through Extend, Add Vocals, or editing tools." },
    use: { zh: "編曲很好但咬字一直破壞結果時", en: "When lyric delivery keeps damaging a good arrangement" },
    copy: { zh: "[Intro: atmospheric pads, filtered drums]\n[Build-Up: rising snare, pitch riser]\n[Drop: heavy bass, main synth lead, high energy]", en: "[Intro: atmospheric pads, filtered drums]\n[Build-Up: rising snare, pitch riser]\n[Drop: heavy bass, main synth lead, high energy]" },
    evidence: "official",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno Add Vocals", "Suno Extend"],
    keywords: ["instrumental", "extend", "add vocals", "骨架"],
  },
  {
    key: "extend-the-good-part",
    category: "workflow",
    title: { zh: "保留好段，只延伸下一塊", en: "Extend the good section" },
    summary: { zh: "Intro 或 Verse 已經對，就不要整首重抽。從乾淨的段落邊界 Extend，替下一段換新的 Style 細節。", en: "If the intro or verse works, do not reroll the whole track. Extend from a clean boundary and rewrite only the next section's style details." },
    use: { zh: "只有 Drop、尾奏或第二段不滿意時", en: "When only the drop, ending, or second section fails" },
    copy: { zh: "Extend from the end of [Build-Up]. Next section: explosive festival drop, heavy sub-bass, supersaw lead, no lead vocal.", en: "Extend from the end of [Build-Up]. Next section: explosive festival drop, heavy sub-bass, supersaw lead, no lead vocal." },
    evidence: "official",
    sources: ["Suno Extend", "Suno V5 Dance Music Tips 2025"],
    keywords: ["extend", "drop", "續寫", "局部"],
  },
  {
    key: "replace-section",
    category: "workflow",
    title: { zh: "壞哪段，修哪段", en: "Replace only the weak section" },
    summary: { zh: "Song Editor 現在可 Replace Section、Edit Lyrics、Crop 與調整段落，教材的剪輯思維比整首重生更適合現行工作流。", en: "Song Editor supports Replace Section, Edit Lyrics, Crop, and section editing, making surgical fixes more useful than full rerolls." },
    use: { zh: "旋律成立，但單一段落失控時", en: "When the song works except for one section" },
    copy: { zh: "Replace this section: keep the chord movement, reduce instrumentation, clearer lead vocal, shorter transition into chorus.", en: "Replace this section: keep the chord movement, reduce instrumentation, clearer lead vocal, shorter transition into chorus." },
    evidence: "official",
    sources: ["Suno Song Editor", "Suno V5 Dance Music Tips 2025"],
    keywords: ["replace", "crop", "song editor", "剪輯"],
  },
  {
    key: "four-on-floor",
    category: "dance",
    title: { zh: "四拍踩穩舞池", en: "Lock the four-on-the-floor" },
    summary: { zh: "用 four-on-the-floor、punchy kick 與明確 BPM 建立 House／Techno 的穩定底盤。", en: "Use four-on-the-floor, a punchy kick, and an exact BPM to anchor House or Techno." },
    use: { zh: "鼓點太碎、舞池推進感不足時", en: "When the beat is too busy or lacks club drive" },
    copy: { zh: "Tech House, 128 BPM, four-on-the-floor, punchy short kick, tight off-beat hi-hats, rolling bassline, dry club mix", en: "Tech House, 128 BPM, four-on-the-floor, punchy short kick, tight off-beat hi-hats, rolling bassline, dry club mix" },
    evidence: "field",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno Music Glossary"],
    keywords: ["house", "techno", "kick", "4/4", "舞曲"],
  },
  {
    key: "sidechain-pump",
    category: "dance",
    title: { zh: "側鏈抽吸感", en: "Sidechain pump" },
    summary: { zh: "sidechained bass、pumping compression 會比只寫 Powerful 更具體地描述底鼓與 Bass 的讓位關係。", en: "Sidechained bass and pumping compression describe the kick-bass relationship more clearly than a generic 'powerful'." },
    use: { zh: "Drop 不夠彈、不夠呼吸時", en: "When the drop lacks bounce and breathing space" },
    copy: { zh: "sidechained synth bass, heavy kick pump, clear transients, mono sub, wide stereo synths", en: "sidechained synth bass, heavy kick pump, clear transients, mono sub, wide stereo synths" },
    evidence: "field",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno AI God Mode Manual"],
    keywords: ["sidechain", "pump", "bass", "compression"],
  },
  {
    key: "edm-transition",
    category: "dance",
    title: { zh: "Riser＋濾波轉場", en: "Riser and filter transition" },
    summary: { zh: "Build-Up 先用 riser、snare roll、filter sweep 累積張力，Drop 再釋放完整低頻。", en: "Build tension with risers, snare rolls, and filter sweeps, then restore the full low end on the drop." },
    use: { zh: "段落黏在一起、高潮沒有到站感時", en: "When sections blur together and the climax has no arrival" },
    copy: { zh: "[Build-Up: layered white-noise riser | rising snare roll | high-pass filter sweep | tension increasing]\n[Drop: full-range sub-bass | supersaw lead | impact hit | high energy]", en: "[Build-Up: layered white-noise riser | rising snare roll | high-pass filter sweep | tension increasing]\n[Drop: full-range sub-bass | supersaw lead | impact hit | high energy]" },
    evidence: "field",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno AI God Mode Manual"],
    keywords: ["riser", "filter", "build-up", "transition", "drop"],
  },
  {
    key: "club-mix-language",
    category: "production",
    title: { zh: "寫聲音特徵，不寫假保證", en: "Describe sound, not fake guarantees" },
    summary: { zh: "保留 punchy sub-bass、clear transients、wide stereo 等可聽特徵；刪除 Pro Tools Session 或 Reference Quality 這類無法由生成結果證明的字眼。", en: "Keep audible traits such as punchy sub-bass, clear transients, and wide stereo. Drop unverifiable claims like Pro Tools Session or Reference Quality." },
    use: { zh: "想要錄音室感或 Club 感時", en: "When asking for a studio or club character" },
    copy: { zh: "club-ready mix, punchy sub-bass, clear transients, controlled dynamics, wide stereo synth field, centered kick and bass", en: "club-ready mix, punchy sub-bass, clear transients, controlled dynamics, wide stereo synth field, centered kick and bass" },
    evidence: "field",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno AI God Mode Manual"],
    keywords: ["mix", "master", "club", "stereo", "transient"],
  },
  {
    key: "key-change",
    category: "theory",
    title: { zh: "轉調當訊號，不當保證", en: "Key change as a signal" },
    summary: { zh: "可在 Extend 或新段落描述升調／降調，但生成模型未必精準服從指定和聲；應以聽感驗證。", en: "You can request modulation during Extend or a new section, but generative models may not follow the exact harmony. Verify by ear." },
    use: { zh: "Final Chorus 需要抬升或 Breakdown 需要降溫時", en: "For a lifted final chorus or a cooler breakdown" },
    copy: { zh: "[Final Chorus | key change from C major to D major | uplifting | full band return]", en: "[Final Chorus | key change from C major to D major | uplifting | full band return]" },
    evidence: "version",
    sources: ["Suno V5 Dance Music Tips 2025", "Suno Music Glossary"],
    keywords: ["key change", "modulation", "升調", "降調", "final chorus"],
  },
  {
    key: "festival-edm",
    category: "recipe",
    title: { zh: "Festival EDM 大 Drop", en: "Festival EDM drop" },
    summary: { zh: "把愛波哥舊配方去掉重複詞，保留明確的速度、主奏、低頻與能量路線。", en: "A cleaned-up AIPOGER recipe with a clear tempo, lead, low end, and energy path." },
    use: { zh: "大型舞台、派對、Drop Battle", en: "Festival stages, parties, and Drop Battle" },
    copy: { zh: "Festival EDM, Big Room House, uplifting and high-energy, supersaw lead, punchy kick, sidechained sub-bass, 132 BPM, bright modern club mix", en: "Festival EDM, Big Room House, uplifting and high-energy, supersaw lead, punchy kick, sidechained sub-bass, 132 BPM, bright modern club mix" },
    evidence: "field",
    sources: ["SUNO Prompt", "Suno V5 Dance Music Tips 2025"],
    keywords: ["edm", "festival", "big room", "drop"],
  },
  {
    key: "raw-techno",
    category: "recipe",
    title: { zh: "Raw Industrial Techno", en: "Raw Industrial Techno" },
    summary: { zh: "把工業感集中在低頻、短 Riff、機械噪訊與乾燥空間，不再混入過多不相干曲風。", en: "Concentrates the industrial identity in low end, short riffs, mechanical noise, and a dry space." },
    use: { zh: "黑暗 Club、地下派對、工業影像", en: "Dark clubs, underground sets, and industrial visuals" },
    copy: { zh: "Raw Techno, Industrial Techno, dark and hypnotic, rumble bass, metallic percussion, short distorted synth riff, 138 BPM, dry warehouse mix", en: "Raw Techno, Industrial Techno, dark and hypnotic, rumble bass, metallic percussion, short distorted synth riff, 138 BPM, dry warehouse mix" },
    evidence: "field",
    sources: ["SUNO Prompt", "Suno V5 Dance Music Tips 2025"],
    keywords: ["techno", "industrial", "dark", "rumble"],
  },
  {
    key: "runway-house",
    category: "recipe",
    title: { zh: "Runway Organic House", en: "Runway Organic House" },
    summary: { zh: "將時尚伸展台的需求收斂為步伐、空間、低頻與冷感，而不是堆十幾種曲風。", en: "Reduces a runway brief to pace, space, bass, and attitude instead of stacking a dozen genres." },
    use: { zh: "服裝秀、精品活動、品牌短片", en: "Fashion shows, luxury events, and brand films" },
    copy: { zh: "Organic House, Indie Dance, cool and confident runway energy, tight kick, elastic bassline, sparse tribal percussion, 122 BPM, polished spacious mix", en: "Organic House, Indie Dance, cool and confident runway energy, tight kick, elastic bassline, sparse tribal percussion, 122 BPM, polished spacious mix" },
    evidence: "field",
    sources: ["SUNO Prompt"],
    keywords: ["runway", "fashion", "organic house", "indie dance"],
  },
  {
    key: "chinese-zen",
    category: "recipe",
    title: { zh: "東方禪意 Electronica", en: "Eastern Zen Electronica" },
    summary: { zh: "把古箏、二胡或笛子當主角，只選一至兩件，讓電子節奏服務旋律而不是蓋過民族樂器。", en: "Feature only one or two traditional instruments so the electronic pulse supports rather than masks them." },
    use: { zh: "東方藝術、展覽、茶空間與品牌氛圍", en: "Eastern art, exhibitions, tea spaces, and branded ambience" },
    copy: { zh: "World Electronica, Chinese folk fusion, meditative and mysterious, guzheng, dizi flute, soft tribal percussion, 112 BPM, spacious organic mix", en: "World Electronica, Chinese folk fusion, meditative and mysterious, guzheng, dizi flute, soft tribal percussion, 112 BPM, spacious organic mix" },
    evidence: "field",
    sources: ["SUNO Prompt"],
    keywords: ["china", "guzheng", "dizi", "zen", "world"],
  },
  {
    key: "young-punk",
    category: "recipe",
    title: { zh: "Young Punk Rock", en: "Young Punk Rock" },
    summary: { zh: "用速度、下刷吉他、真鼓與群唱副歌建立青春衝撞感，避免塞入器材品牌名稱。", en: "Use tempo, downstroked guitars, live drums, and gang vocals for youthful impact without unnecessary gear brands." },
    use: { zh: "青春、運動、校園、熱血短片", en: "Youth, sports, campus, and energetic edits" },
    copy: { zh: "Young Punk Rock, Pop Punk, rebellious and uplifting, fast downstroke guitars, driving bass, live drums, gang-vocal chorus, 148 BPM, raw bright mix", en: "Young Punk Rock, Pop Punk, rebellious and uplifting, fast downstroke guitars, driving bass, live drums, gang-vocal chorus, 148 BPM, raw bright mix" },
    evidence: "field",
    sources: ["SUNO Prompt", "Suno AI God Mode Manual"],
    keywords: ["punk", "rock", "young", "gang vocal"],
  },
  {
    key: "tibetan-world",
    category: "recipe",
    title: { zh: "Tibetan World Fusion", en: "Tibetan World Fusion" },
    summary: { zh: "保留宗教與文化素材時要謹慎，使用自己有權處理的聲音，避免把神聖唱誦當成廉價效果。", en: "Treat religious and cultural material respectfully, use audio you have the right to process, and avoid reducing sacred chant to a cheap effect." },
    use: { zh: "世界音樂、冥想與文化主題作品", en: "World music, meditation, and culture-led work" },
    copy: { zh: "Tibetan-inspired world ambient, sacred and contemplative, long horn drones, bamboo flute, frame drums, 96 BPM, deep spacious atmosphere", en: "Tibetan-inspired world ambient, sacred and contemplative, long horn drones, bamboo flute, frame drums, 96 BPM, deep spacious atmosphere" },
    evidence: "field",
    sources: ["SUNO Prompt"],
    keywords: ["tibetan", "world", "ambient", "sacred"],
  },
  {
    key: "romantic-bossa",
    category: "recipe",
    title: { zh: "Romantic Bossa R&B", en: "Romantic Bossa R&B" },
    summary: { zh: "把早期 LOVE 配方整理成柔和的節奏、低音與敘事人聲，減少互相競爭的 Salsa／Rock 標籤。", en: "Cleans the early LOVE recipe into a gentle groove, bass, and story-led vocal without competing Salsa and Rock tags." },
    use: { zh: "咖啡廳、約會、生活風格短片", en: "Cafes, dates, and lifestyle films" },
    copy: { zh: "Bossa Nova, Contemporary R&B, romantic and intimate, nylon guitar, double bass, soft brushed drums, 92 BPM, warm close vocal mix", en: "Bossa Nova, Contemporary R&B, romantic and intimate, nylon guitar, double bass, soft brushed drums, 92 BPM, warm close vocal mix" },
    evidence: "field",
    sources: ["SUNO Prompt"],
    keywords: ["bossa", "r&b", "romantic", "jazz"],
  },
];

export const SUNO_PROMPT_MOVES: SunoTechnique<SunoPromptCategory>[] = [
  ...SUNO_CORE_PROMPT_MOVES,
  ...SUNO_STUDIO_MASTERING_MOVES,
];

export const SUNO_LYRIC_MOVES: SunoTechnique<SunoLyricCategory>[] = [
  {
    key: "core-song-map",
    category: "structure",
    title: { zh: "八段流行歌地圖", en: "Eight-part pop map" },
    summary: { zh: "段落標籤是歌曲導航，不是歌詞。每段開頭就近放置，比只在最上方列一次更清楚。", en: "Section labels are navigation, not lyrics. Place each one directly before its section instead of listing them once at the top." },
    use: { zh: "一般流行、搖滾、R&B 的完整架構", en: "Complete pop, rock, or R&B structures" },
    copy: { zh: "[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Verse 2]\n[Bridge]\n[Final Chorus]\n[Outro]", en: "[Intro]\n[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Verse 2]\n[Bridge]\n[Final Chorus]\n[Outro]" },
    evidence: "official",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno Music Glossary"],
    keywords: ["intro", "verse", "chorus", "bridge", "outro", "結構"],
  },
  {
    key: "enriched-section-cue",
    category: "formatting",
    title: { zh: "一個方括號，說完這段要做什麼", en: "One bracket, one section instruction" },
    summary: { zh: "把段落名稱、動態變化與唱法合在同一個方括號，不要拆成相鄰的三個標籤。作者建議整首先抓 4–8 個重點 cue；若被忽略，先刪減而不是再加標籤。", en: "Combine the section name, movement, and delivery in one bracket instead of stacking adjacent tags. The author suggests starting with 4–8 key cues; if they are ignored, simplify before adding more." },
    use: { zh: "Suno 把提示誤判成新段落，或標籤越加越失控時", en: "When Suno treats cues as extra sections or more tags create less control" },
    copy: { zh: "[Intro - Sparse Entrance]\n[Verse 1 - Locked Groove, intimate]\n[Pre-Chorus - Rising Tension]\n[Chorus - Wide Release, harmony stack]\n[Bridge - Quiet Contrast, spoken]\n[Final Chorus - Final Surge, ad-libs]\n[Outro - Afterglow]", en: "[Intro - Sparse Entrance]\n[Verse 1 - Locked Groove, intimate]\n[Pre-Chorus - Rising Tension]\n[Chorus - Wide Release, harmony stack]\n[Bridge - Quiet Contrast, spoken]\n[Final Chorus - Final Surge, ad-libs]\n[Outro - Afterglow]" },
    evidence: "version",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill", "Suno V4.5 Better Prompts in Lyrics"],
    keywords: ["combined bracket", "enriched cue", "4-8", "over-tagging", "simplify", "方括號", "段落提示"],
  },
  {
    key: "dance-song-map",
    category: "structure",
    title: { zh: "舞曲能量地圖", en: "Dance energy map" },
    summary: { zh: "舞曲用 Build-Up／Drop／Breakdown 明確安排累積、釋放與喘息，不要把 Drop 當成一般副歌的同義詞。", en: "Use Build-Up, Drop, and Breakdown to map tension, release, and breathing room. A drop is not merely another word for chorus." },
    use: { zh: "EDM、House、Trance、Bass Music", en: "EDM, House, Trance, and bass music" },
    copy: { zh: "[Intro]\n[Build-Up]\n[Drop]\n[Verse]\n[Breakdown]\n[Build-Up]\n[Final Drop]\n[Outro]", en: "[Intro]\n[Build-Up]\n[Drop]\n[Verse]\n[Breakdown]\n[Build-Up]\n[Final Drop]\n[Outro]" },
    evidence: "field",
    sources: ["Suno V5 Dance Music Tips 2025", "愛波哥的 Suno 聖經 2026 V1"],
    keywords: ["build-up", "drop", "breakdown", "edm", "舞曲"],
  },
  {
    key: "parentheses-rule",
    category: "formatting",
    title: { zh: "方括號下指令，圓括號當伴唱", en: "Brackets direct; parentheses perform" },
    summary: { zh: "教材實測中，[ ] 用於段落與表演提示；( ) 容易被唱成和聲、回音或內心聲。不要把製作備註塞進圓括號。", en: "In the supplied tests, [ ] carries section or delivery cues while ( ) tends to become backing, echo, or inner voice. Keep production notes out of parentheses." },
    use: { zh: "Suno 把備註唱出來時", en: "When Suno sings your production notes" },
    copy: { zh: "[spoken word]\n你從來沒有回頭\n\n(我還在這裡)", en: "[spoken word]\nYou never looked back\n\n(I'm still here)" },
    evidence: "field",
    sources: ["Suno小標籤提示詞 1", "愛波哥的 Suno 聖經 2026 V1"],
    keywords: ["bracket", "parentheses", "spoken", "伴唱", "括號"],
  },
  {
    key: "performance-symbols",
    category: "formatting",
    title: { zh: "延音、拼字與重音", en: "Sustain, spell, and emphasize" },
    summary: { zh: "~、連字號、長母音與少量 ALL CAPS 可改變咬字感，但屬機率提示；一次只測一種變化。", en: "Tildes, hyphens, stretched vowels, and selective ALL CAPS can influence delivery, but they remain probabilistic. Test one change at a time." },
    use: { zh: "一句需要拖長、拼字或爆發時", en: "For a held, spelled, or explosive lyric moment" },
    copy: { zh: "free~dom~\nA-I-P-O-G-E-R\nWE RISE together\nEverybodyyyyy", en: "free~dom~\nA-I-P-O-G-E-R\nWE RISE together\nEverybodyyyyy" },
    evidence: "version",
    sources: ["Suno小標籤提示詞 1", "愛波哥的 Suno 聖經 2026 V1"],
    keywords: ["caps", "tilde", "hyphen", "延音", "拼字"],
  },
  {
    key: "hook-first",
    category: "structure",
    title: { zh: "先丟一句 Hook", en: "Open with the hook" },
    summary: { zh: "短影音或記憶點導向作品，可先出 Hook，再進 Verse；Hook 要比 Verse 更短、更能獨立成立。", en: "For short-form or recall-led songs, open with a hook before the verse. Keep it shorter and more self-contained than the verse." },
    use: { zh: "短影音、廣告、Drop 前快速抓耳", en: "Short-form video, ads, and fast attention" },
    copy: { zh: "[Intro | hook first]\n今晚不回頭——不回頭\n\n[Verse 1]\n城市把名字藏進霓虹裡", en: "[Intro | hook first]\nWe don't look back—not tonight\n\n[Verse 1]\nThe city hides our names in neon" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["hook", "shorts", "reels", "記憶點"],
  },
  {
    key: "singability-edit",
    category: "structure",
    title: { zh: "歌詞要唱得過，不只讀得順", en: "Edit for the mouth, not only the page" },
    summary: { zh: "主歌用具體地點、物件與動作推進畫面；副歌縮成可重複的標題句。最後把每句念出來，重音卡住就改字，不要靠漂亮押韻硬撐。", en: "Build verses from places, objects, and actions; compress the chorus into a repeatable title phrase. Read every line aloud and rewrite any stress that fights the mouth." },
    use: { zh: "文字看起來很美，但生成後咬字擁擠、重音奇怪時", en: "When lyrics look polished but generate with crowded diction or awkward stress" },
    copy: { zh: "主歌檢查：有地點／物件／動作，不只寫氣氛\n副歌檢查：短、可重唱、盡量帶歌名\n朗讀檢查：重音卡住就換字，刪掉泛用填充句", en: "Verse check: include place/object/action, not only mood\nChorus check: short, repeatable, preferably carries the title\nRead-aloud check: rewrite awkward stress and remove generic filler" },
    evidence: "field",
    sources: ["NuNaught Suno Prompting Guide", "suno-songwriting open agent skill"],
    keywords: ["singability", "stress", "specific images", "title phrase", "generic filler", "可唱性", "重音", "朗讀"],
  },
  {
    key: "bridge-contrast",
    category: "structure",
    title: { zh: "Bridge 不能只是 Verse 3", en: "A bridge needs contrast" },
    summary: { zh: "橋段至少改變一項：觀點、和聲、節奏密度或唱法。若內容和主歌同一個角度，就失去橋段作用。", en: "A bridge should change at least one dimension: viewpoint, harmony, rhythmic density, or delivery. Otherwise it is only Verse 3." },
    use: { zh: "中段無聊、Final Chorus 沒有反差時", en: "When the middle drags or the final chorus lacks contrast" },
    copy: { zh: "[Bridge | half-time | minimal instrumentation | vulnerable vocal]\n如果沉默也是答案\n那我終於聽懂了", en: "[Bridge | half-time | minimal instrumentation | vulnerable vocal]\nIf silence was the answer\nI finally heard it" },
    evidence: "field",
    sources: ["Suno AI God Mode Manual", "愛波哥的 Suno 聖經 2026 V1"],
    keywords: ["bridge", "contrast", "half-time", "橋段"],
  },
  {
    key: "vocal-delivery",
    category: "vocal",
    title: { zh: "唱法字典", en: "Vocal delivery palette" },
    summary: { zh: "用可聽見的唱法描述取代空泛的「好聽」：whisper、spoken word、falsetto、belting、crooning、raspy、scat。", en: "Replace vague requests like 'sing beautifully' with audible delivery terms: whisper, spoken word, falsetto, belting, crooning, raspy, or scat." },
    use: { zh: "歌手個性不明確時", en: "When the singer lacks a distinct character" },
    copy: { zh: "[Verse | intimate crooning | warm baritone]\n[Pre-Chorus | falsetto | emotional build-up]\n[Chorus | powerful belting | stacked harmonies]", en: "[Verse | intimate crooning | warm baritone]\n[Pre-Chorus | falsetto | emotional build-up]\n[Chorus | powerful belting | stacked harmonies]" },
    evidence: "field",
    sources: ["SUNO Prompt", "Suno小標籤提示詞 1", "Suno Music Glossary"],
    keywords: ["whisper", "falsetto", "belting", "crooning", "vocal"],
  },
  {
    key: "emotion-line",
    category: "emotion",
    title: { zh: "情緒提示就近放", en: "Place emotion beside the line" },
    summary: { zh: "Crying、Vulnerable、Defiant 等提示放在情緒句前一行，比整首最上方寫一次更容易定位。", en: "Place cues such as Crying, Vulnerable, or Defiant on the line before the emotional lyric rather than only once at the top." },
    use: { zh: "只有某一句要崩潰、憤怒或反抗時", en: "When only one line needs to break, rage, or resist" },
    copy: { zh: "[spoken word crying]\n你怎麼可以連再見都省略\n\n[Defiant]\n但我不會再為你停下", en: "[spoken word crying]\nHow could you even skip goodbye\n\n[Defiant]\nBut I won't stop for you again" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["crying", "vulnerable", "defiant", "emotion", "情緒"],
  },
  {
    key: "vocal-effects",
    category: "vocal",
    title: { zh: "人聲效果不要整首開滿", en: "Use vocal effects locally" },
    summary: { zh: "Telephone、Vocoder、Distorted、Heavy Reverb 適合轉場或特定段落；全曲使用容易失去反差。", en: "Telephone, vocoder, distortion, and heavy reverb work best as local moments. Using them everywhere removes contrast." },
    use: { zh: "想做轉場、復古、機器人或失真人聲時", en: "For transitions, vintage color, robotic voices, or distortion" },
    copy: { zh: "[Intro | filtered vocals | telephone effect]\n[Chorus | clean lead vocal | harmonized chorus]\n[Outro | vocoder | heavy reverb]", en: "[Intro | filtered vocals | telephone effect]\n[Chorus | clean lead vocal | harmonized chorus]\n[Outro | vocoder | heavy reverb]" },
    evidence: "version",
    sources: ["Suno小標籤提示詞 1", "Suno AI God Mode Manual"],
    keywords: ["vocoder", "telephone", "reverb", "distorted", "effects"],
  },
  {
    key: "duet-three-anchors",
    category: "duet",
    title: { zh: "二重唱三處錨定", en: "Three-anchor duet" },
    summary: { zh: "Style 欄宣告角色、歌詞頂部再宣告一次、每段指定歌手。整段分配給同一位，通常比逐句交替穩。", en: "Declare roles in Style, repeat them at the lyric header, then label each section. Whole-section assignments are usually steadier than line-by-line swaps." },
    use: { zh: "男女對唱、人聲一直互換失控時", en: "When duet voices keep swapping unpredictably" },
    copy: { zh: "Style: duet between Kai (male) and Lin (female), cinematic pop\n\n[Duet: Kai male and Lin female]\n[Verse 1]\n[Kai]\n（男聲歌詞）\n[Chorus]\n[Both]\n（合唱歌詞）\n[Verse 2]\n[Lin]\n（女聲歌詞）", en: "Style: duet between Kai (male) and Lin (female), cinematic pop\n\n[Duet: Kai male and Lin female]\n[Verse 1]\n[Kai]\n(male lyric)\n[Chorus]\n[Both]\n(shared lyric)\n[Verse 2]\n[Lin]\n(female lyric)" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["duet", "male", "female", "both", "二重唱"],
  },
  {
    key: "satb-chorus",
    category: "duet",
    title: { zh: "SATB 只留給高潮", en: "Reserve SATB for the peak" },
    summary: { zh: "Soprano／Alto／Tenor／Bass 疊唱若整首都用會失去放大感，適合 Final Chorus 或單一大副歌。", en: "Soprano, Alto, Tenor, and Bass layers lose impact when used everywhere. Save them for one major chorus or the finale." },
    use: { zh: "福音、史詩、體育場副歌", en: "Gospel, epic, and stadium choruses" },
    copy: { zh: "[Final Chorus | multiple voice chorus SATB | gospel choir | full band | triumphant]", en: "[Final Chorus | multiple voice chorus SATB | gospel choir | full band | triumphant]" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["satb", "choir", "gospel", "chorus"],
  },
  {
    key: "adlib-pocket",
    category: "duet",
    title: { zh: "Ad-lib 塞在節奏空隙", en: "Place ad-libs in the pocket" },
    summary: { zh: "HEY、UH、YEAH 不要每行都有；放在主句之間，才能增加彈性而不搶 Hook。", en: "Do not put HEY, UH, or YEAH on every line. Use them between lead phrases so they add bounce without stealing the hook." },
    use: { zh: "Hip-Hop、Trap、Pop、R&B", en: "Hip-Hop, Trap, Pop, and R&B" },
    copy: { zh: "[Verse | autotuned delivery]\nRunning through the city lights\n[adlib HEY]\nNothing ever slows me down\n[adlib UH UH]\nStill the same, still alive", en: "[Verse | autotuned delivery]\nRunning through the city lights\n[adlib HEY]\nNothing ever slows me down\n[adlib UH UH]\nStill the same, still alive" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["adlib", "hey", "trap", "hip-hop", "襯詞"],
  },
  {
    key: "call-response",
    category: "duet",
    title: { zh: "讓樂器回答歌手", en: "Let the instrument answer" },
    summary: { zh: "一句人聲後接短樂器提示，能形成 call-and-response；不要連續塞太多 Solo。", en: "Place a short instrument cue after a vocal line to create call and response. Avoid stacking too many solos." },
    use: { zh: "Blues、Jazz、Rock 或情緒型 Pre-Chorus", en: "Blues, Jazz, Rock, or an emotional pre-chorus" },
    copy: { zh: "[Pre-Chorus | emotional build-up]\n你還聽得見我嗎\n[Guitar solo | melodic response | blues scale]\n你還記得這首歌嗎\n[Saxophone | short answer phrase]", en: "[Pre-Chorus | emotional build-up]\nCan you still hear me now\n[Guitar solo | melodic response | blues scale]\nDo you still remember this song\n[Saxophone | short answer phrase]" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["call response", "solo", "guitar", "saxophone", "互動"],
  },
  {
    key: "stadium-frame",
    category: "atmosphere",
    title: { zh: "體育場開場與收尾", en: "Stadium opening and landing" },
    summary: { zh: "群眾、掌聲與舞台殘響只放 Intro／Outro，讓現場感成為框架，不要淹沒整首歌。", en: "Keep crowd, applause, and stage reverb in the intro or outro so live ambience frames rather than buries the song." },
    use: { zh: "Festival、Live Anthem、Choice 開場", en: "Festivals, live anthems, and Choice openings" },
    copy: { zh: "[Intro | stadium crowd ambience | distant chanting | stage reverb]\n[Outro | crowd fade | applause | stadium echo]", en: "[Intro | stadium crowd ambience | distant chanting | stage reverb]\n[Outro | crowd fade | applause | stadium echo]" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["stadium", "crowd", "applause", "live"],
  },
  {
    key: "ambient-scene",
    category: "atmosphere",
    title: { zh: "環境聲只選一個場景", en: "Choose one ambient scene" },
    summary: { zh: "Rain、Ocean Waves、City Ambience、Forest 等應服務同一畫面；互不相干的環境聲一起出現會讓意圖模糊。", en: "Rain, ocean waves, city ambience, or forest should support one scene. Unrelated environments muddy the intent." },
    use: { zh: "Ambient、冥想、電影感前奏", en: "Ambient, meditation, and cinematic intros" },
    copy: { zh: "[Intro | gentle rain on window | distant city ambience | sparse piano | intimate]", en: "[Intro | gentle rain on window | distant city ambience | sparse piano | intimate]" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno Sounds"],
    keywords: ["rain", "forest", "ocean", "city", "ambient"],
  },
  {
    key: "dramatic-stop",
    category: "atmosphere",
    title: { zh: "停頓比再加一層更有力", en: "Silence can hit harder" },
    summary: { zh: "Drop 或 Final Chorus 前可嘗試 Silence、band drop-out、drum fill；模型不一定精準，但結構意圖清楚。", en: "Try silence, a band drop-out, or a drum fill before a drop or final chorus. Timing may vary, but the structural intent stays clear." },
    use: { zh: "高潮前沒有空氣、衝擊不夠時", en: "When the climax lacks air and impact" },
    copy: { zh: "[Band drop-out before final chorus]\n[Silence]\n[Drum fill transition into final chorus]\n[Final Chorus | full band | explosive]", en: "[Band drop-out before final chorus]\n[Silence]\n[Drum fill transition into final chorus]\n[Final Chorus | full band | explosive]" },
    evidence: "version",
    sources: ["愛波哥的 Suno 聖經 2026 V1", "Suno AI God Mode Manual"],
    keywords: ["silence", "stop", "drum fill", "drop-out", "停頓"],
  },
];

export const SUNO_GENRE_GROUPS: SunoGenreGroup[] = [
  { key: "ambient", label: { zh: "氛圍音樂", en: "Ambient Music" }, terms: ["Ambient", "Atmosphere", "Dark Ambient"] },
  { key: "bass", label: { zh: "Bass Music", en: "Bass Music" }, terms: ["Glitch Hop", "Witch House"] },
  { key: "breakbeat", label: { zh: "碎拍", en: "Breakbeat Music" }, terms: ["Big Beat", "Breakbeat", "Breaks"] },
  { key: "chillout", label: { zh: "Chillout", en: "Chillout Music" }, terms: ["Chill", "Chill Hop", "Chillout", "Chillwave", "Downtempo", "Lounge", "Psychill", "Vaporwave"] },
  { key: "classical", label: { zh: "古典與管弦", en: "Classical Music" }, terms: ["Classical", "Neoclassical", "Orchestral"] },
  { key: "disco", label: { zh: "Disco", en: "Disco Music" }, terms: ["Indie Dance", "Italo Disco", "Nu Disco"] },
  { key: "dnb", label: { zh: "Drum & Bass", en: "Drum & Bass" }, terms: ["Drum and Bass", "Liquid Funk", "Microfunk", "Neurofunk"] },
  { key: "dub", label: { zh: "Dub 與 Reggae", en: "Dub Music" }, terms: ["Dub", "Reggae"] },
  { key: "dubstep", label: { zh: "Dubstep", en: "Dubstep" }, terms: ["Brostep", "Chillstep"] },
  { key: "edm", label: { zh: "EDM", en: "EDM" }, terms: ["Bassline", "Big Room", "EDM", "Tropical House"] },
  { key: "electronica", label: { zh: "Electronica", en: "Electronica Music" }, terms: ["8-bit", "Braindance", "Electronica", "IDM", "Synthwave"] },
  { key: "folk", label: { zh: "民謠與世界", en: "Folk & World" }, terms: ["Folk", "World Music"] },
  { key: "garage", label: { zh: "Garage", en: "Garage Music" }, terms: ["2-Step Garage", "Garage"] },
  { key: "hiphop", label: { zh: "Hip-Hop", en: "Hip-Hop Music" }, terms: ["Drill", "Hip-Hop", "Lo-Fi Hip-Hop", "New Jack Swing", "Phonk", "Trap"] },
  { key: "house", label: { zh: "House", en: "House Music" }, terms: ["Bassline House", "Ethno House", "Deep House", "Disco House", "Electro House", "House", "Melodic House", "Minimal House", "Tech House", "Tribal House"] },
  { key: "industrial", label: { zh: "Industrial", en: "Industrial" }, terms: ["EBM", "Industrial"] },
  { key: "jazz-funk", label: { zh: "Jazz & Funk", en: "Jazz & Funk" }, terms: ["Acid Jazz", "Electro Funk", "Funk"] },
  { key: "pop", label: { zh: "Pop", en: "Pop Music" }, terms: ["Commercial Pop", "Country Pop", "Future Pop", "Hyperpop", "Indie Pop", "K-Pop", "Latin Pop", "Pop", "R&B", "Reggaeton", "Slow Ballad", "Synth Pop"] },
  { key: "rock", label: { zh: "Rock", en: "Rock" }, terms: ["Indie Rock", "Motorik", "Post-Rock", "Rock", "Metal"] },
  { key: "techno", label: { zh: "Techno", en: "Techno Music" }, terms: ["Acid Techno", "Deep Techno", "Dub Techno", "Gabber", "Hard Techno", "Minimal Techno", "Techno"] },
  { key: "trance", label: { zh: "Trance", en: "Trance Music" }, terms: ["Chillgressive", "Psytrance", "Psychedelic Trance", "Trance", "Uplifting Trance"] },
];

export const AI_PRODUCTION_FLOW: { title: SunoLocalizedText; body: SunoLocalizedText }[] = [
  { title: { zh: "01 定義方向", en: "01 Define" }, body: { zh: "用 Prompt、情境與記憶點定義這一版只要測什麼；歌詞與選擇仍由人負責。", en: "Define the one thing this version must test with a prompt, scene, and memory point; people still own the lyric and decisions." } },
  { title: { zh: "02 生成三版", en: "02 Render three" }, body: { zh: "同一組設定先做三版，再挑旋律、能量與人聲身份最穩的版本，不靠一次中獎。", en: "Render three versions from the same setup, then select the most stable melody, energy, and vocal identity instead of hoping for one lucky take." } },
  { title: { zh: "03 AIPOGER 聽感驗證", en: "03 Validate" }, body: { zh: "上傳作品交給 A&R Gate，看聲音 DNA、歌詞記憶點與最適合的內容路線；再用留言、愛心與收藏觀察反應。", en: "Bring the track to A&R Gate for sonic DNA, lyric memory, and route judgement; then watch comments, Hearts, and saves for audience signals." } },
  { title: { zh: "04 選擇測試場", en: "04 Test in public" }, body: { zh: "需要短片段比較就走 Drop；需要兩首歌對決就走 Q Crash；完整作品先進探索或傷心酒吧累積真實聆聽。", en: "Use Drop for focused short tests, Q Crash for a two-song decision, and Explore or Bar Heartbreak for full-song listening." } },
  { title: { zh: "05 發表與策展", en: "05 Release and curate" }, body: { zh: "通過驗證的作品才往 Showtime；想做方向策展，就進 Choice，讓歌曲有被記住與被分享的出口。", en: "Move validated work toward Showtime; use Choice when a curated direction can give the songs a memorable, shareable home." } },
  { title: { zh: "06 保存歷程", en: "06 Archive" }, body: { zh: "保存 Prompt、歌詞草稿、模型版本、工程檔、授權與發表紀錄，讓成功條件可以重現。", en: "Keep prompts, lyric drafts, model version, project files, rights, and release records so successful conditions can be reproduced." } },
];

export function sunoLibraryText(text: SunoLocalizedText, locale: SunoLibraryLocale) {
  return text[locale];
}
