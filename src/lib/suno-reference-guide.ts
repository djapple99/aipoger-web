export type ReferenceLocale = "zh" | "en";

export type ReferenceText = {
  zh: string;
  en: string;
};

export type ReferenceSource = {
  label: string;
  url: string;
};

export type SunoCommandReferenceKind = "field" | "tag" | "control" | "edit";

export type SunoCommandReference = {
  key: string;
  kind: SunoCommandReferenceKind;
  title: ReferenceText;
  syntax: ReferenceText;
  effect: ReferenceText;
  caution: ReferenceText;
  version: ReferenceText;
  evidence: "official" | "field" | "version";
  source: ReferenceSource;
  keywords: string[];
};

export type SunoProblemRoute = {
  key: string;
  title: ReferenceText;
  body: ReferenceText;
  href: string;
};

export type QuickStartField = {
  key: "style" | "lyrics" | "title";
  eyebrow: string;
  title: ReferenceText;
  body: ReferenceText;
  example: ReferenceText;
};

export const SUNO_OFFICIAL_CROSS_CHECK_DATE = "2026-07-28";
export const SUNO_REFERENCE_PAGE_UPDATED_DATE = "2026-07-28";

export const SUNO_PROBLEM_ROUTES: readonly SunoProblemRoute[] = [
  {
    key: "beginner",
    title: { zh: "我是新手", en: "I am new to Suno" },
    body: { zh: "先分清 Style、Lyrics、Title，再用一份模板做第一版。", en: "Separate Style, Lyrics, and Title before making your first controlled draft." },
    href: "#suno-control-desk",
  },
  {
    key: "lyrics-rushed",
    title: { zh: "歌詞唱不清楚", en: "The lyrics are rushed" },
    body: { zh: "從聽見的咬字問題反推行長、段落與留白，不要一直整首重抽。", en: "Trace diction back to line length, sections, and breathing room instead of rerolling the whole song." },
    href: "#suno-troubleshooting",
  },
  {
    key: "weak-hook",
    title: { zh: "副歌記不住", en: "The chorus is forgettable" },
    body: { zh: "先修短主句，再用三版比較哪一個記憶點真的留下來。", en: "Shorten the main line, then compare three renders to find the hook that stays." },
    href: "#suno-troubleshooting",
  },
  {
    key: "release",
    title: { zh: "準備發表", en: "I am preparing a release" },
    body: { zh: "先查權利，再走 A&R、Drop／Q Crash，最後進 Showtime 或 Choice。", en: "Check rights, validate through A&R and Drop/Q Crash, then move toward Showtime or Choice." },
    href: "#rights-release",
  },
] as const;

export const SUNO_COMMAND_REFERENCE: readonly SunoCommandReference[] = [
  {
    key: "style-field",
    kind: "field",
    title: { zh: "Style 欄：先定義聲音骨架", en: "Style field: lock the sonic frame" },
    syntax: { zh: "[主曲風], [次曲風], [律動／能量], [聲線], [主樂器角色], [製作質地]", en: "[genre], [subgenre], [groove / energy], [vocal identity], [lead instrument role], [production texture]" },
    effect: { zh: "控制整首歌的曲風、聲線、樂器位置與整體質地。", en: "Sets the track-wide genre, vocal identity, instrument roles, and production texture." },
    caution: { zh: "先留 4–7 個互相相容的重點；不要把整個故事塞進 Style。", en: "Start with 4–7 compatible priorities; do not put the whole story in Style." },
    version: { zh: "Custom Mode · 欄位工作法", en: "Custom Mode · field workflow" },
    evidence: "field",
    source: { label: "AIPOGER 實測方法", url: "https://aipoger.com/ai-music-bible?lang=zh#suno-control-desk" },
    keywords: ["style", "曲風", "聲線", "genre"],
  },
  {
    key: "lyrics-field",
    kind: "field",
    title: { zh: "Lyrics 欄：安排怎麼唱", en: "Lyrics field: shape the delivery" },
    syntax: { zh: "[段落標籤]\n短句建立畫面\n\n[Chorus]\n一句能被記住的主句", en: "[section tag]\nShort lines build the scene\n\n[Chorus]\nOne line worth remembering" },
    effect: { zh: "放歌詞、段落、留白與就近的表演提示，讓模型知道哪裡收、哪裡放。", en: "Holds lyrics, sections, spacing, and nearby performance cues so the model can shape the arc." },
    caution: { zh: "一行只留一個動作；標籤是提示，不是固定命令。", en: "Keep one action per line; tags are cues, not guaranteed commands." },
    version: { zh: "Custom Mode · 歌詞控制", en: "Custom Mode · lyric control" },
    evidence: "official",
    source: { label: "Suno Custom Lyrics", url: "https://help.suno.com/en/articles/2415873" },
    keywords: ["lyrics", "歌詞", "段落", "custom lyrics"],
  },
  {
    key: "section-tags",
    kind: "tag",
    title: { zh: "[Verse]／[Chorus]／[Bridge]", en: "[Verse] / [Chorus] / [Bridge]" },
    syntax: { zh: "[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Bridge]\n[Final Chorus]", en: "[Verse 1]\n[Pre-Chorus]\n[Chorus]\n[Bridge]\n[Final Chorus]" },
    effect: { zh: "提供段落地圖，幫助模型理解歌曲要在哪裡建立、推高與回收。", en: "Provides a section map for building, lifting, and resolving the song." },
    caution: { zh: "每段再加一個可聽見的變化就好；不要同時塞結構、混音與十個演出指令。", en: "Add one audible change per section; do not stack structure, mix, and ten performance commands." },
    version: { zh: "版本敏感 · 生成提示", en: "Version-sensitive · generation cue" },
    evidence: "version",
    source: { label: "Suno Custom Lyrics", url: "https://help.suno.com/en/articles/2415873" },
    keywords: ["verse", "chorus", "bridge", "段落", "標籤"],
  },
  {
    key: "section-cue",
    kind: "tag",
    title: { zh: "段落就近提示", en: "Local section cue" },
    syntax: { zh: "[Verse 1 - intimate, sparse piano]\n[Chorus - wider harmony, full drums]", en: "[Verse 1 - intimate, sparse piano]\n[Chorus - wider harmony, full drums]" },
    effect: { zh: "把唱法、密度或樂器變化放在它真正發生的段落旁邊。", en: "Places delivery, density, or instrument changes beside the section where they should happen." },
    caution: { zh: "同一段只指定一個主變化，否則難以知道哪個條件有效。", en: "Give each section one main change so you can tell which condition worked." },
    version: { zh: "實測方法 · 非保證語法", en: "Field method · not guaranteed syntax" },
    evidence: "field",
    source: { label: "AIPOGER 實測方法", url: "https://aipoger.com/ai-music-bible?lang=zh#suno-troubleshooting" },
    keywords: ["section cue", "表演", "密度", "段落提示"],
  },
  {
    key: "no-vocals",
    kind: "tag",
    title: { zh: "[no vocals] 純音樂提示", en: "[no vocals] instrumental cue" },
    syntax: { zh: "[no vocals]\n[Instrumental intro]\n[Instrumental break]", en: "[no vocals]\n[Instrumental intro]\n[Instrumental break]" },
    effect: { zh: "把某一段的期待導向純樂器空間，適合前奏、間奏或背景音樂測試。", en: "Guides a section toward instrumental space for intros, breaks, or background-music tests." },
    caution: { zh: "不是絕對靜音開關；請聽三版確認人聲是否真的退出。", en: "It is not a guaranteed mute switch; compare three renders to confirm the vocal actually leaves." },
    version: { zh: "版本敏感 · 生成提示", en: "Version-sensitive · generation cue" },
    evidence: "version",
    source: { label: "Suno Custom Lyrics", url: "https://help.suno.com/en/articles/2415873" },
    keywords: ["no vocals", "instrumental", "純音樂", "前奏", "間奏"],
  },
  {
    key: "creative-sliders",
    kind: "control",
    title: { zh: "Creative Sliders", en: "Creative Sliders" },
    syntax: { zh: "Weirdness · Style Influence · Audio Influence", en: "Weirdness · Style Influence · Audio Influence" },
    effect: { zh: "調整生成方向的個性、Style 服從度與音訊參考影響力。", en: "Shapes generation personality, Style adherence, and the influence of audio references." },
    caution: { zh: "這些是方向旋鈕，不是精準參數；一次只動一個，才有辦法比較。", en: "These are directional controls, not precision parameters; change one at a time." },
    version: { zh: "Suno 官方功能 · 依方案與版本確認", en: "Official Suno feature · verify plan and version" },
    evidence: "official",
    source: { label: "Suno Creative Sliders", url: "https://help.suno.com/en/articles/6141377" },
    keywords: ["weirdness", "style influence", "audio influence", "滑桿"],
  },
  {
    key: "song-editor",
    kind: "edit",
    title: { zh: "Song Editor：先修局部", en: "Song Editor: fix the useful section" },
    syntax: { zh: "Replace · Edit Lyrics · Extend · Crop · Fade", en: "Replace · Edit Lyrics · Extend · Crop · Fade" },
    effect: { zh: "對已經有潛力的歌曲局部替換、改詞、延伸、裁切與淡入淡出。", en: "Replace, revise, extend, crop, and fade promising sections without rerolling everything." },
    caution: { zh: "先保留原始版本與 Prompt；編輯不能替代完整的聽感驗收。", en: "Keep the original render and prompt; editing does not replace a full listening check." },
    version: { zh: "Suno 官方功能 · 依方案與版本確認", en: "Official Suno feature · verify plan and version" },
    evidence: "official",
    source: { label: "Suno Song Editor", url: "https://help.suno.com/en/articles/6141505" },
    keywords: ["song editor", "replace", "extend", "crop", "fade", "編輯"],
  },
] as const;

export const SUNO_QUICK_START_FIELDS: readonly QuickStartField[] = [
  {
    key: "style",
    eyebrow: "01 · STYLE",
    title: { zh: "先決定聲音骨架", en: "Lock the sonic frame" },
    body: {
      zh: "用曲風、年代、律動、聲線、主樂器與製作質地，說清楚這首歌要往哪裡走。",
      en: "Define genre, era, groove, vocal identity, lead instrument, and production texture.",
    },
    example: {
      zh: "曲風, 年代, 律動, 聲線, 主樂器角色, 製作質地",
      en: "genre, era, groove, vocal identity, lead instrument role, production texture",
    },
  },
  {
    key: "lyrics",
    eyebrow: "02 · LYRICS",
    title: { zh: "再安排怎麼唱", en: "Shape how it sings" },
    body: {
      zh: "用段落標籤分場；每行只留一個清楚動作，先讓副歌讀起來就有節奏。",
      en: "Use section labels, keep one clear action per line, and make the chorus rhythmic before rendering.",
    },
    example: {
      zh: "[Verse 1]\n短句建立畫面\n\n[Chorus]\n一句能記住的主句",
      en: "[Verse 1]\nShort lines build the scene\n\n[Chorus]\nOne line worth remembering",
    },
  },
  {
    key: "title",
    eyebrow: "03 · TITLE",
    title: { zh: "最後替記憶點命名", en: "Name the memory point" },
    body: {
      zh: "標題不是摘要。優先選副歌裡最能被複述、搜尋、分享的一小句。",
      en: "A title is not a synopsis. Pull a short, repeatable phrase from the chorus.",
    },
    example: {
      zh: "2–6 個字／詞，最好能在副歌裡聽見",
      en: "2–6 words, ideally heard inside the chorus",
    },
  },
] as const;

export const SUNO_STARTER_TEMPLATE: ReferenceText = {
  zh: "STYLE\n[曲風], [年代], [律動], [聲線], [主樂器角色], [製作質地]\n\nLYRICS\n[Verse 1]\n[用短句建立畫面]\n\n[Chorus]\n[一句能被記住的主句]\n\nTITLE\n[從副歌挑出 2–6 個字／詞]",
  en: "STYLE\n[genre], [era], [groove], [vocal identity], [lead instrument role], [production texture]\n\nLYRICS\n[Verse 1]\n[build the scene with short lines]\n\n[Chorus]\n[one line worth remembering]\n\nTITLE\n[pull 2–6 words from the chorus]",
};

export const SUNO_PREFLIGHT_ITEMS: readonly { key: string; text: ReferenceText; evidence: "field" | "rights" }[] = [
  { key: "one-goal", text: { zh: "這一版只測一件事：曲風、唱法、歌詞、Drop 或音色。", en: "Test one variable in this version: style, delivery, lyric, Drop, or timbre." }, evidence: "field" },
  { key: "style-density", text: { zh: "Style 先留 4–7 個互相不打架的重點；太滿就拆成下一版。", en: "Start with 4–7 compatible Style cues; move extras into another version." }, evidence: "field" },
  { key: "vocal-identity", text: { zh: "聲線身份只定義一次，避免同時要求互相衝突的年齡、質地與唱腔。", en: "Define one vocal identity and remove conflicting age, texture, or delivery cues." }, evidence: "field" },
  { key: "section-map", text: { zh: "歌詞已有 Verse／Chorus／Bridge 等清楚段落，空行也留好了。", en: "Lyrics have clear Verse, Chorus, and Bridge sections with useful spacing." }, evidence: "field" },
  { key: "singability", text: { zh: "每行能順口念完；過長句、連續抽象詞與難唱尾音已先修短。", en: "Every line reads naturally; long clauses, abstract stacks, and awkward endings are trimmed." }, evidence: "field" },
  { key: "three-renders", text: { zh: "準備用同一設定生成 3 版，再比較真正穩定的條件。", en: "Plan three renders from the same setup before judging what is stable." }, evidence: "field" },
  { key: "rights", text: { zh: "歌詞、聲音、取樣與上傳素材的使用權都已確認。", en: "Rights for lyrics, voices, samples, and uploaded material are confirmed." }, evidence: "rights" },
  { key: "archive", text: { zh: "會保存 Prompt、模型版本、日期與成功版本，之後才有辦法重現。", en: "Save the prompt, model version, date, and winning render so the result can be revisited." }, evidence: "field" },
] as const;

export const SUNO_TROUBLESHOOTING: readonly {
  key: string;
  symptom: ReferenceText;
  likely: ReferenceText;
  move: ReferenceText;
}[] = [
  {
    key: "muddy-arrangement",
    symptom: { zh: "編曲很滿、每件樂器都在搶", en: "The arrangement feels crowded" },
    likely: { zh: "同時塞太多主角與質地詞，沒有安排前後景。", en: "Too many lead roles and textures compete without foreground/background." },
    move: { zh: "只留一個主樂器，其他改寫成支撐角色；刪掉兩個形容詞再生成。", en: "Keep one lead instrument, turn the rest into support roles, and remove two adjectives." },
  },
  {
    key: "vocal-drift",
    symptom: { zh: "主唱每一段像不同人", en: "The singer changes identity by section" },
    likely: { zh: "聲線描述重複或互相矛盾，段落裡又加入新身份。", en: "The vocal description conflicts or introduces a new identity in later sections." },
    move: { zh: "把年齡感、質地、唱腔縮成一條聲線身份；段落只寫表演動作。", en: "Reduce age, texture, and delivery to one identity; use section cues only for performance." },
  },
  {
    key: "lyrics-rushed",
    symptom: { zh: "歌詞被趕拍、咬字糊在一起", en: "Lyrics rush or blur together" },
    likely: { zh: "單行字太多、標點太密，或旋律空間不足。", en: "Lines are too long, punctuation is dense, or the melody has no breathing room." },
    move: { zh: "一行只留一個動作；用空行分句，把關鍵字放在較短的句尾。", en: "Keep one action per line, add breathing space, and land key words at shorter line endings." },
  },
  {
    key: "weak-hook",
    symptom: { zh: "副歌有旋律，卻記不住一句話", en: "The chorus has melody but no memorable line" },
    likely: { zh: "主句太長、太像說明，沒有重複與前後對比。", en: "The main line is too explanatory, with no repetition or contrast." },
    move: { zh: "把主句縮成 6–12 字／2–6 個詞，第二次只改最後一個關鍵字。", en: "Cut the hook to 2–6 words and change only the final keyword on its second pass." },
  },
  {
    key: "ignored-structure",
    symptom: { zh: "段落標籤被忽略，歌還是自己亂跑", en: "Section labels are ignored" },
    likely: { zh: "每段提示太多，或同一段同時要求結構、混音與演唱細節。", en: "Each section carries too many structural, mix, and performance instructions." },
    move: { zh: "每段只留一個可聽見的變化；重新生成比較，不把標籤當成保證指令。", en: "Keep one audible change per section and compare fresh renders; labels are cues, not guarantees." },
  },
  {
    key: "harsh-master",
    symptom: { zh: "聲音很大但刺、扁、容易失真", en: "The result is loud, harsh, or flattened" },
    likely: { zh: "把生成用的 mix／master 形容詞當成真正後期處理。", en: "Generation mix/master language is being treated as actual post-mastering." },
    move: { zh: "先換成平衡、清楚、保留動態的描述；匯出後再用 DAW 檢查 LUFS、True Peak 與失真。", en: "Ask for balance, clarity, and dynamics; after export, check LUFS, True Peak, and distortion in a DAW." },
  },
] as const;

export const SUNO_FEATURE_WATCH: readonly {
  key: string;
  title: ReferenceText;
  status: ReferenceText;
  body: ReferenceText;
  source: ReferenceSource;
}[] = [
  {
    key: "v55",
    title: { zh: "Suno v5.5", en: "Suno v5.5" },
    status: { zh: "官方功能", en: "Official feature" },
    body: { zh: "Voices、Custom Models 與 My Taste 會影響可用工作流；方案與介面改動時要重新核對。", en: "Voices, Custom Models, and My Taste change the available workflow; re-check plan and interface changes." },
    source: { label: "Suno v5.5", url: "https://help.suno.com/en/articles/11362305" },
  },
  {
    key: "sliders",
    title: { zh: "Creative Sliders", en: "Creative Sliders" },
    status: { zh: "官方功能", en: "Official feature" },
    body: { zh: "Weirdness、Style Influence 與 Audio Influence 是方向控制，不是精準參數；一次只調一個比較好判斷。", en: "Weirdness, Style Influence, and Audio Influence guide direction rather than act as exact parameters. Change one at a time." },
    source: { label: "Creative Sliders", url: "https://help.suno.com/en/articles/6141377" },
  },
  {
    key: "editor",
    title: { zh: "Song Editor", en: "Song Editor" },
    status: { zh: "官方功能", en: "Official feature" },
    body: { zh: "可替換段落、改歌詞、延伸、裁切與做淡入淡出；先局部修，不必每次整首重抽。", en: "Replace sections, revise lyrics, extend, crop, and add fades before rerolling an entire song." },
    source: { label: "Song Editor", url: "https://help.suno.com/en/articles/6141505" },
  },
] as const;

export const SUNO_RIGHTS_GUIDE: readonly {
  key: string;
  title: ReferenceText;
  body: ReferenceText;
  source: ReferenceSource;
  tone: "green" | "amber" | "cyan";
}[] = [
  {
    key: "paid-commercial",
    title: { zh: "要商用，先確認生成當下的方案", en: "Check the plan active when the song was made" },
    body: { zh: "官方說明將付費訂閱期間生成的歌曲與商業使用權連結；真正發行前仍要以當期條款與你的素材權利為準。", en: "Suno links commercial use to songs made while subscribed. Before release, verify the current terms and every source asset." },
    source: { label: "Commercial use", url: "https://help.suno.com/en/articles/9601665" },
    tone: "green",
  },
  {
    key: "free-plan",
    title: { zh: "免費方案作品不要直接當商用資產", en: "Do not assume free-plan songs are commercial assets" },
    body: { zh: "先把它當非商業測試；若要發行、授權、上架或接案，先查當期方案與條款。", en: "Treat it as a non-commercial test until the active plan and terms are verified for release, licensing, or client work." },
    source: { label: "Commercial use", url: "https://help.suno.com/en/articles/9601665" },
    tone: "amber",
  },
  {
    key: "retroactive",
    title: { zh: "後來訂閱，不代表舊歌自動補權利", en: "A later subscription does not automatically cover old songs" },
    body: { zh: "先保留生成日期、方案與檔案紀錄；不要把事後升級當成所有舊作品都能商用。", en: "Keep generation dates, plan records, and files. Do not treat a later upgrade as retroactive rights for every old song." },
    source: { label: "Retroactive rights", url: "https://help.suno.com/en/articles/2425729" },
    tone: "amber",
  },
  {
    key: "copyright",
    title: { zh: "能商用，不等於一定取得著作權", en: "Commercial use does not guarantee copyright protection" },
    body: { zh: "著作權會受地區、人工創作程度與素材來源影響。保留歌詞修改、編曲、錄音與後期的人工作業證據。", en: "Copyright depends on jurisdiction, human contribution, and source material. Preserve evidence of lyric, arrangement, recording, and post-production work." },
    source: { label: "Copyright", url: "https://help.suno.com/en/articles/2746945" },
    tone: "cyan",
  },
] as const;

export type PublicFaqLocale = "zh" | "en" | "ja" | "ko";

export const PUBLIC_BIBLE_FAQ: Record<PublicFaqLocale, readonly { question: string; answer: string }[]> = {
  zh: [
    { question: "Suno 的 Style、Lyrics、Title 要怎麼分？", answer: "Style 決定聲音方向，Lyrics 安排段落與唱法，Title 替最重要的記憶點命名。三個欄位各做一件事，通常比把所有要求塞在一起更容易比較結果。" },
    { question: "Prompt 寫越長越好嗎？", answer: "不是。先保留少量互相相容、能聽見的重點，再一次只測一個變數。生成結果仍會受模型版本與隨機性影響。" },
    { question: "段落標籤一定會被 Suno 照做嗎？", answer: "不一定。Verse、Chorus 等標籤是引導，不是保證指令。每段提示越單純，越容易判斷是哪個條件產生差異。" },
    { question: "Suno 生成的歌可以商用嗎？", answer: "要看生成當下的方案、當期條款與你使用的歌詞、聲音、取樣等素材權利。商用權與著作權也不是同一件事。" },
    { question: "為什麼同一個 Prompt 每次結果不同？", answer: "AI 音樂生成帶有隨機性，模型版本、聲線、歌詞密度與控制設定也會改變結果。保留設定並做三版比較，比只聽一次更可靠。" },
  ],
  en: [
    { question: "How should Style, Lyrics, and Title be divided in Suno?", answer: "Use Style for sonic direction, Lyrics for sections and delivery, and Title for the strongest memory point. Giving each field one job makes results easier to compare." },
    { question: "Is a longer prompt always better?", answer: "No. Start with a few compatible, audible priorities and test one variable at a time. Results remain probabilistic and version-sensitive." },
    { question: "Will Suno always follow section labels?", answer: "No. Labels such as Verse and Chorus are cues rather than guaranteed commands. Simpler section instructions are easier to evaluate." },
    { question: "Can a Suno song be used commercially?", answer: "It depends on the plan active when it was generated, the current terms, and the rights to lyrics, voices, samples, and other inputs. Commercial use and copyright protection are separate questions." },
    { question: "Why does the same prompt produce different songs?", answer: "AI music generation is probabilistic. Model version, vocal identity, lyric density, and control settings also affect the result. Save the setup and compare three renders." },
  ],
  ja: [
    { question: "SunoのStyle・Lyrics・Titleはどう分けますか？", answer: "Styleは音の方向、Lyricsは構成と歌い方、Titleは最も強い記憶点に使います。各欄に一つの役割を持たせると結果を比較しやすくなります。" },
    { question: "Promptは長いほど良いですか？", answer: "いいえ。互いに矛盾しない、聴いて確認できる要素から始め、一度に一つの変数を試します。結果はモデルのバージョンやランダム性にも左右されます。" },
    { question: "セクションタグは必ず反映されますか？", answer: "必ずではありません。VerseやChorusは方向を示す手掛かりで、保証された命令ではありません。" },
    { question: "Sunoで生成した曲は商用利用できますか？", answer: "生成時のプラン、現在の規約、歌詞・声・サンプルなど入力素材の権利を確認する必要があります。商用利用と著作権保護は別の問題です。" },
    { question: "同じPromptでも結果が変わるのはなぜですか？", answer: "AI音楽生成にはランダム性があります。モデル、声、歌詞の密度、設定を保存し、複数バージョンを比較してください。" },
  ],
  ko: [
    { question: "Suno의 Style, Lyrics, Title은 어떻게 나누나요?", answer: "Style은 사운드 방향, Lyrics는 구성과 창법, Title은 가장 강한 기억 포인트에 사용하세요. 각 입력란에 한 가지 역할을 주면 결과를 비교하기 쉽습니다." },
    { question: "Prompt는 길수록 좋은가요?", answer: "아닙니다. 서로 충돌하지 않고 실제로 들을 수 있는 핵심부터 시작해 한 번에 한 변수만 테스트하세요. 결과는 모델 버전과 확률의 영향도 받습니다." },
    { question: "섹션 태그는 항상 적용되나요?", answer: "항상 그렇지는 않습니다. Verse와 Chorus 같은 태그는 방향을 주는 단서이지 보장된 명령이 아닙니다." },
    { question: "Suno로 만든 곡을 상업적으로 사용할 수 있나요?", answer: "생성 당시 요금제, 현재 약관, 가사·보이스·샘플 등 입력 자료의 권리를 확인해야 합니다. 상업적 이용 권한과 저작권 보호는 별개의 문제입니다." },
    { question: "같은 Prompt인데 결과가 달라지는 이유는 무엇인가요?", answer: "AI 음악 생성에는 확률성이 있습니다. 모델, 보컬, 가사 밀도와 설정을 저장하고 여러 버전을 비교하세요." },
  ],
};
