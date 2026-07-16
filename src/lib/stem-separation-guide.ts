export type StemGuideLocale = "zh" | "en";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type StemGoalKey =
  | "vocals"
  | "fast"
  | "control"
  | "damaged"
  | "repair"
  | "free"
  | "batch";

export type StemEngine = {
  key: string;
  name: string;
  family: LocalizedText;
  access: LocalizedText;
  confidence: "confirmed" | "mixed" | "undisclosed";
  summary: LocalizedText;
  bestFor: LocalizedText;
  strengths: LocalizedText[];
  limits: LocalizedText[];
  implementations: LocalizedText[];
  sources: { label: string; url: string }[];
};

export type StemGoal = {
  key: StemGoalKey;
  label: LocalizedText;
  pick: LocalizedText;
  why: LocalizedText;
  engineKeys: string[];
};

export function stemText(text: LocalizedText, locale: StemGuideLocale) {
  return text[locale];
}

export const STEM_GOALS: StemGoal[] = [
  {
    key: "vocals",
    label: { zh: "人聲最乾淨", en: "Clean vocals" },
    pick: { zh: "先試 UVR 的 RoFormer / MDX 類模型", en: "Start with a RoFormer or MDX-family model in UVR" },
    why: { zh: "免費、可換模型，適合針對不同歌曲比較；結果很吃模型與設定。", en: "It is free and model-selectable, which makes track-by-track comparison practical. Results depend heavily on model and settings." },
    engineKeys: ["uvr-community"],
  },
  {
    key: "fast",
    label: { zh: "最快完成", en: "Fast turnaround" },
    pick: { zh: "已有 Ableton 就先用 Music AI；Apple Silicon 可先試 Logic", en: "Use Music AI inside Ableton if you already own it; try Logic first on Apple silicon" },
    why: { zh: "兩者都整合在 DAW 內，少一次上傳、下載與整理檔案。", en: "Both live inside the DAW, removing an extra upload, download, and file-management step." },
    engineKeys: ["music-ai", "apple-stem-splitter"],
  },
  {
    key: "control",
    label: { zh: "需要手動修乾淨", en: "Manual control" },
    pick: { zh: "SpectraLayers Pro", en: "SpectraLayers Pro" },
    why: { zh: "它不只拆軌，還能在頻譜層手動清除殘留與重新分配聲音。", en: "It goes beyond one-click splitting with spectral cleanup and layer-level correction." },
    engineKeys: ["spectralayers"],
  },
  {
    key: "damaged",
    label: { zh: "低音質或複雜混音", en: "Damaged or dense mix" },
    pick: { zh: "先用 LALAL.AI 切換模型比較，再決定是否付費", en: "Compare LALAL.AI model options before paying" },
    why: { zh: "同一首歌可換神經網路重跑；先聽預覽，比品牌名稱更可靠。", en: "You can retry a difficult track with another network. Judge the preview, not the brand name." },
    engineKeys: ["lalal-ai"],
  },
  {
    key: "repair",
    label: { zh: "修復與重平衡", en: "Repair and rebalance" },
    pick: { zh: "iZotope RX Music Rebalance", en: "iZotope RX Music Rebalance" },
    why: { zh: "重點是修復、相位穩定與後續處理，不是只把四軌匯出。", en: "Choose it for restoration, phase-conscious work, and follow-up repair rather than simple four-stem export." },
    engineKeys: ["izotope-rx"],
  },
  {
    key: "free",
    label: { zh: "免費離線", en: "Free and local" },
    pick: { zh: "UVR 或 Demucs", en: "UVR or Demucs" },
    why: { zh: "不必把音檔上傳到雲端；代價是安裝、模型選擇與運算時間。", en: "No cloud upload is required; the tradeoff is setup, model selection, and processing time." },
    engineKeys: ["uvr-community", "demucs"],
  },
  {
    key: "batch",
    label: { zh: "大量批次或 API", en: "Batch or API" },
    pick: { zh: "AudioShake 或 Music AI 企業 API", en: "AudioShake or Music AI enterprise APIs" },
    why: { zh: "適合目錄、標籤或影音工作流；個人偶爾拆一首通常不需要。", en: "Designed for catalogs, labels, and media pipelines; usually unnecessary for occasional single-track work." },
    engineKeys: ["audioshake", "music-ai"],
  },
];
export const STEM_ENGINES: StemEngine[] = [
  {
    key: "demucs",
    name: "Demucs / HTDemucs",
    family: { zh: "開源混合式分離模型", en: "Open-source hybrid separation" },
    access: { zh: "本機・免費", en: "Local · Free" },
    confidence: "confirmed",
    summary: { zh: "以波形與頻譜混合架構處理音樂來源分離，是許多免費工具可選用的模型家族。Meta 原始專案已封存，社群分支仍可使用。", en: "A waveform-and-spectrogram model family used by many free workflows. Meta's original repository is archived, while community forks remain available." },
    bestFor: { zh: "鼓、Bass、一般四軌拆分與離線工作", en: "Drums, bass, general four-stem work, and offline processing" },
    strengths: [
      { zh: "低頻與節奏聲部通常有清楚輪廓", en: "Often preserves a clear low-end and rhythmic outline" },
      { zh: "可完全離線，不必交出原始音檔", en: "Can run fully offline without uploading source audio" },
    ],
    limits: [
      { zh: "密集吉他、合成器與高頻殘留仍可能互相滲漏", en: "Dense guitars, synths, and high-frequency content can still bleed" },
      { zh: "不同模型版本的結果差異很大", en: "Results vary substantially by model version" },
    ],
    implementations: [
      { zh: "UVR 的 Demucs 模式", en: "Demucs modes inside UVR" },
      { zh: "Demucs 社群分支與命令列工具", en: "Community Demucs forks and command-line tools" },
    ],
    sources: [{ label: "Demucs GitHub", url: "https://github.com/facebookresearch/demucs" }],
  },
  {
    key: "spleeter",
    name: "Deezer Spleeter",
    family: { zh: "開源頻譜模型・Legacy", en: "Open-source spectrogram model · Legacy" },
    access: { zh: "本機・免費", en: "Local · Free" },
    confidence: "confirmed",
    summary: { zh: "2019 年帶動普及的高速分離工具，官方提供 2、4、5 軌模型。現在更適合快速草稿，不是追求最高音質的第一選擇。", en: "The fast 2019 library that helped popularize source separation, with official 2-, 4-, and 5-stem models. It is better suited to quick drafts than maximum fidelity today." },
    bestFor: { zh: "快速預覽、低運算環境、舊工作流相容", en: "Fast previews, lighter hardware, and legacy pipeline compatibility" },
    strengths: [
      { zh: "速度快、伺服器成本低", en: "Very fast with low processing overhead" },
      { zh: "官方模型與輸出格式明確", en: "Clear official model and output options" },
    ],
    limits: [
      { zh: "人聲容易出現水聲或金屬感", en: "Vocals can sound watery or metallic" },
      { zh: "官方模型更新較久，現代模型通常更乾淨", en: "Official releases are old and modern models are usually cleaner" },
    ],
    implementations: [{ zh: "Spleeter CLI、Docker 與舊版整合工具", en: "Spleeter CLI, Docker, and legacy integrations" }],
    sources: [{ label: "Deezer Spleeter", url: "https://github.com/deezer/spleeter" }],
  },
  {
    key: "uvr-community",
    name: "UVR / MDX-Net / VR / RoFormer",
    family: { zh: "社群模型工作台", en: "Community model workbench" },
    access: { zh: "本機・免費", en: "Local · Free" },
    confidence: "mixed",
    summary: { zh: "UVR 不是單一引擎，而是把 Demucs、MDX、VR 與多種社群模型放在同一介面的工具箱。最大優勢是能針對人聲、伴奏或特定樂器換模型。", en: "UVR is not one engine. It is a workbench that hosts Demucs, MDX, VR, and community model families, allowing task-specific model selection." },
    bestFor: { zh: "人聲／伴奏分離、願意花時間試模型的人", en: "Vocal/instrumental work for users willing to compare models" },
    strengths: [
      { zh: "RoFormer 與 MDX 類模型常能提供很乾淨的人聲", en: "RoFormer and MDX-family models can produce very clean vocals" },
      { zh: "模型選擇、ensemble 與參數控制完整", en: "Deep model, ensemble, and parameter control" },
    ],
    limits: [
      { zh: "選錯模型可能比一鍵工具更差", en: "The wrong model can perform worse than a one-click tool" },
      { zh: "安裝與顯示卡相容性需要自行處理", en: "Installation and GPU compatibility require hands-on setup" },
    ],
    implementations: [{ zh: "Ultimate Vocal Remover 圖形介面", en: "Ultimate Vocal Remover GUI" }],
    sources: [{ label: "Ultimate Vocal Remover", url: "https://ultimatevocalremover.com/" }],
  },
  {
    key: "music-ai",
    name: "Music AI / Moises",
    family: { zh: "商用授權模型平台", en: "Licensed proprietary model platform" },
    access: { zh: "DAW 整合・App・API", en: "DAW · App · API" },
    confidence: "confirmed",
    summary: { zh: "Music AI 提供商用分離模型與 API；Ableton 官方已確認 Live 12.3 的 Stem Separation 由 Music AI 演算法驅動。Moises 是同公司的消費端產品。", en: "Music AI provides commercial separation models and APIs. Ableton officially confirms that Live 12.3 Stem Separation is powered by Music AI algorithms; Moises is the company's consumer product." },
    bestFor: { zh: "已在 Ableton 工作、重視 DAW 內速度與穩定性", en: "Ableton users who value an integrated, dependable DAW workflow" },
    strengths: [
      { zh: "Ableton 內直接拆成 Vocal、Drums、Bass、Other", en: "Splits directly to Vocals, Drums, Bass, and Other in Ableton" },
      { zh: "提供 High Speed 與 High Quality 工作模式", en: "Offers High Speed and High Quality workflows" },
    ],
    limits: [
      { zh: "不要假設同公司每個產品都使用完全相同版本的模型", en: "Do not assume every product from the same company runs an identical model version" },
      { zh: "功能與費用取決於宿主 DAW、App 或 API 方案", en: "Features and cost depend on the host DAW, app, or API plan" },
    ],
    implementations: [
      { zh: "Ableton Live 12.3 Suite", en: "Ableton Live 12.3 Suite" },
      { zh: "Moises App 與 Music AI API", en: "Moises app and Music AI API" },
    ],
    sources: [
      { label: "Ableton Stem Separation", url: "https://www.ableton.com/stem-separation-in-ableton-live/" },
      { label: "Ableton FAQ", url: "https://help.ableton.com/hc/en-us/articles/23730994755996-Stem-Separation-in-Ableton-Live-FAQ" },
    ],
  },
  {
    key: "spectralayers",
    name: "Steinberg SpectraLayers",
    family: { zh: "專有頻譜拆分與編輯", en: "Proprietary spectral unmixing and editing" },
    access: { zh: "桌面軟體・ARA", en: "Desktop · ARA" },
    confidence: "confirmed",
    summary: { zh: "把自動 Unmix 與頻譜層編輯放在一起，適合拆完後還要手動清理、修對話或重新分配聲音的工作。", en: "Combines automatic unmixing with spectral layer editing for manual cleanup, dialogue repair, and reassignment after separation." },
    bestFor: { zh: "需要精修、對話後製、法證或複雜音訊修復", en: "Detailed cleanup, dialogue post, forensic work, and complex repair" },
    strengths: [
      { zh: "拆軌後可直接在頻譜上修殘留", en: "Lets you repair residual bleed directly in the spectrum" },
      { zh: "不只一鍵分離，完整版本是深度編輯器", en: "The full version is a deep editor, not only a one-click splitter" },
    ],
    limits: [
      { zh: "只想快速拆四軌時可能過度複雜", en: "Can be excessive for simple four-stem jobs" },
      { zh: "不同版本與宿主 DAW 的功能不完全相同", en: "Capabilities vary by edition and host integration" },
    ],
    implementations: [
      { zh: "SpectraLayers Pro / Go", en: "SpectraLayers Pro / Go" },
      { zh: "Cubase、Nuendo 與支援 ARA 的工作流", en: "Cubase, Nuendo, and supported ARA workflows" },
    ],
    sources: [{ label: "Steinberg SpectraLayers", url: "https://www.steinberg.net/spectralayers/" }],
  },
  {
    key: "apple-stem-splitter",
    name: "Apple Logic Stem Splitter",
    family: { zh: "Apple Silicon 專屬本機模型", en: "Apple-silicon-only local model" },
    access: { zh: "Logic Pro・本機", en: "Logic Pro · Local" },
    confidence: "confirmed",
    summary: { zh: "Logic Pro 11.2 可拆 Vocal、Drums、Bass、Guitar、Piano、Other 六軌，直接產生可編輯的 Track Stack；需要 M1 或更新的 Apple Silicon。", en: "Logic Pro 11.2 can extract Vocals, Drums, Bass, Guitar, Piano, and Other into an editable track stack. It requires an M1 or later Apple-silicon Mac." },
    bestFor: { zh: "已用 Logic 與 Apple Silicon、想最快開始編曲", en: "Logic users on Apple silicon who want the shortest route back to arranging" },
    strengths: [
      { zh: "完全在本機執行，不用訂閱拆軌服務", en: "Runs locally without a separate splitting subscription" },
      { zh: "六軌與自訂 submix 直接落在專案裡", en: "Six stems and custom submixes land directly in the project" },
    ],
    limits: [
      { zh: "Intel Mac、Windows 與 Rosetta 模式不可用", en: "Unavailable on Intel Macs, Windows, or Logic running under Rosetta" },
      { zh: "不能自行換模型或調整底層參數", en: "No user-selectable model or low-level tuning" },
    ],
    implementations: [{ zh: "Logic Pro 11.2 以上 Stem Splitter", en: "Stem Splitter in Logic Pro 11.2+" }],
    sources: [
      { label: "Apple Stem Splitter Guide", url: "https://support.apple.com/guide/logicpro/lgcp61bae908/mac" },
      { label: "Logic Pro 11.2", url: "https://support.apple.com/guide/logicpro/lgcp02e40443/mac" },
    ],
  },
  {
    key: "lalal-ai",
    name: "LALAL.AI",
    family: { zh: "專有 Transformer 分離服務", en: "Proprietary transformer separation service" },
    access: { zh: "Web・App・本機 VST・API", en: "Web · App · Local VST · API" },
    confidence: "confirmed",
    summary: { zh: "提供多種神經網路、樂器類型與預覽比較。原 PDF 稱其為「直接合成」，但官方目前只明確說明 AI 與 Transformer 技術，因此網站不把直接合成列為已確認事實。", en: "Offers multiple neural networks, instrument targets, and preview comparison. The PDF calls it direct synthesis, but current official material only clearly documents AI and transformer technology, so that claim is not treated as confirmed here." },
    bestFor: { zh: "難拆歌曲、想快速換模型比較、不想先設定開源工具", en: "Difficult tracks, quick model comparison, and users who do not want open-source setup" },
    strengths: [
      { zh: "可依歌曲換神經網路並先聽預覽", en: "Lets you change neural networks and preview before full processing" },
      { zh: "支援 Vocal、Drums、Bass、Guitar、Piano、Synth 等多種目標", en: "Supports vocals, drums, bass, guitar, piano, synth, and more" },
    ],
    limits: [
      { zh: "多數完整輸出與大量處理需要付費", en: "Full exports and higher-volume processing generally require payment" },
      { zh: "Web 模式涉及上傳音檔；敏感素材先看隱私與授權條款", en: "Web workflows upload audio; review privacy and rights terms for sensitive material" },
    ],
    implementations: [{ zh: "LALAL.AI Web、桌面 App、VST 與 API", en: "LALAL.AI web, desktop app, VST, and API" }],
    sources: [{ label: "LALAL.AI", url: "https://www.lalal.ai/" }],
  },
  {
    key: "izotope-rx",
    name: "iZotope RX Music Rebalance",
    family: { zh: "修復導向的專有機器學習", en: "Repair-focused proprietary ML" },
    access: { zh: "桌面軟體・ARA", en: "Desktop · ARA" },
    confidence: "confirmed",
    summary: { zh: "RX 的核心是音訊修復；Music Rebalance 把混音分成 Vocal、Bass、Percussion、Other，再接去修殘留、降噪或重平衡。", en: "RX is an audio-repair suite. Music Rebalance separates Vocal, Bass, Percussion, and Other before follow-up cleanup, denoising, or rebalancing." },
    bestFor: { zh: "舊錄音、破損來源、混音救援與後續修復", en: "Old recordings, compromised sources, mix rescue, and follow-up restoration" },
    strengths: [
      { zh: "分離後可接完整 RX 修復工具鏈", en: "Feeds directly into the broader RX restoration toolchain" },
      { zh: "適合只調整某聲部，不一定要全部匯出", en: "Useful for rebalancing one source without exporting every stem" },
    ],
    limits: [
      { zh: "價格與運算量高於單純拆軌工具", en: "Costs and processes more than a simple splitter" },
      { zh: "若只做 remix 草稿，功能可能用不完", en: "May be overpowered for a quick remix draft" },
    ],
    implementations: [{ zh: "iZotope RX 11 Music Rebalance", en: "Music Rebalance in iZotope RX 11" }],
    sources: [{ label: "iZotope RX", url: "https://www.izotope.com/pages/rx-features" }],
  },
  {
    key: "audioshake",
    name: "AudioShake",
    family: { zh: "企業級音訊分離平台", en: "Enterprise audio-separation platform" },
    access: { zh: "Web・API・企業服務", en: "Web · API · Enterprise" },
    confidence: "confirmed",
    summary: { zh: "以音樂目錄、影視、同步授權、Karaoke 與大量資料處理為主，提供樂器 stems、對話／音樂／效果分離及開發者 API。", en: "Built for catalogs, film/TV, sync, karaoke, and data pipelines, with instrument stems, dialogue/music/effects separation, and developer APIs." },
    bestFor: { zh: "唱片目錄、影視後期、批次處理與 API 串接", en: "Catalogs, post-production, batch processing, and API integration" },
    strengths: [
      { zh: "工作流與 API 面向大量正式素材", en: "Workflows and APIs are designed for large professional catalogs" },
      { zh: "不只音樂 stems，也涵蓋對話與影音用途", en: "Covers dialogue and media workflows beyond music stems" },
    ],
    limits: [
      { zh: "個人偶爾拆一首，通常不需要企業級方案", en: "Enterprise infrastructure is unnecessary for occasional personal use" },
      { zh: "費用與權限依方案和商務合約而定", en: "Pricing and access depend on plan and commercial agreement" },
    ],
    implementations: [{ zh: "AudioShake Indie、Live、API 與企業資料服務", en: "AudioShake Indie, Live, API, and enterprise data services" }],
    sources: [{ label: "AudioShake", url: "https://www.audioshake.ai/" }],
  },
  {
    key: "ripx",
    name: "RipX DAW",
    family: { zh: "音符與泛音物件化編輯", en: "Note-and-harmonic object editing" },
    access: { zh: "獨立桌面軟體", en: "Standalone desktop" },
    confidence: "confirmed",
    summary: { zh: "它的重點不是只輸出幾條 stem，而是把混音轉成可編輯的音符、泛音、音高與聲像物件，適合進一步改音或創意重組。", en: "Its focus is not merely exporting stems. It converts a mix into editable note, harmonic, pitch, and spatial objects for deeper manipulation." },
    bestFor: { zh: "改音符、改音高、聲音替換與創意 remix", en: "Note edits, pitch changes, sound replacement, and creative remixing" },
    strengths: [
      { zh: "拆分後可做到音符層級編輯", en: "Supports note-level editing after separation" },
      { zh: "工作方式和一般四軌 splitter 明顯不同", en: "A genuinely different workflow from standard four-stem splitters" },
    ],
    limits: [
      { zh: "學習曲線高，不是一般一鍵替代品", en: "A steeper learning curve and not a drop-in one-click replacement" },
      { zh: "自動辨識後仍可能需要手動重分配音符", en: "Automatic analysis may still require manual note reassignment" },
    ],
    implementations: [{ zh: "RipX DAW / RipX DAW PRO", en: "RipX DAW / RipX DAW PRO" }],
    sources: [
      { label: "RipX DAW", url: "https://hitnmix.com/" },
      { label: "Rip Audio Format", url: "https://hitnmix.com/rip-audio/" },
    ],
  },
];
