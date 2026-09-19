export type TaiwaneseLyricsCategory = "人稱" | "動作與狀態" | "時間" | "情緒與口語" | "空間與疑問";

export type TaiwaneseLyricsEntry = {
  key: string;
  category: TaiwaneseLyricsCategory;
  meaning: string;
  recommended: string;
  sunoWriting: string;
  note: string;
};

export const TAIWANESE_LYRICS_CATEGORIES: TaiwaneseLyricsCategory[] = [
  "人稱",
  "動作與狀態",
  "時間",
  "情緒與口語",
  "空間與疑問",
];

export const TAIWANESE_LYRICS_ENTRIES: TaiwaneseLyricsEntry[] = [
  { key: "pronoun-me", category: "人稱", meaning: "我", recommended: "阮／我", sunoWriting: "阮", note: "讀 gún 或 ún；在 Suno 中通常能順暢唱出台語的我或我們。" },
  { key: "pronoun-you", category: "人稱", meaning: "你", recommended: "汝", sunoWriting: "哩", note: "借用哩協助唱出 lí，避免落成華語的你。" },
  { key: "pronoun-we", category: "人稱", meaning: "我們", recommended: "咱／咱人", sunoWriting: "咱攏", note: "咱攏是我們大家，歌唱時的連讀通常較自然。" },
  { key: "pronoun-self", category: "人稱", meaning: "我自己", recommended: "我自己／阮家己", sunoWriting: "阮 ka-tī／阮ka-tīi", note: "混合羅馬字 ka-tī，有助於維持家己的台語發音。" },
  { key: "action-follow", category: "動作與狀態", meaning: "跟", recommended: "隨／佮", sunoWriting: "tuè／尬", note: "隨 tuè 常接在人稱前；尬是佮 kah 的借音寫法。" },
  { key: "action-at", category: "動作與狀態", meaning: "在", recommended: "佇／咧", sunoWriting: "勒／咧／置／抵", note: "進行式可試勒或咧，位置可試置或抵，依句子調整。" },
  { key: "action-want-go", category: "動作與狀態", meaning: "要往", recommended: "欲往", sunoWriting: "欲往", note: "發音約 beh óng，多數情況可直接使用。" },
  { key: "action-not-let-go", category: "動作與狀態", meaning: "不放", recommended: "毋放", sunoWriting: "毋放", note: "發音 m̄-pàng。" },
  { key: "time-last-night", category: "時間", meaning: "昨夜", recommended: "昨暝", sunoWriting: "昨暝", note: "發音 tsah-mî。" },
  { key: "time-night", category: "時間", meaning: "夜晚", recommended: "暗暝／暗晡", sunoWriting: "暗席／暗暝", note: "暗暝較經典；暗席是依特定口語聽感設計的實驗寫法。" },
  { key: "state-all-are", category: "動作與狀態", meaning: "都是", recommended: "攏是", sunoWriting: "攏是", note: "發音 lóng-sī，通常辨識穩定。" },
  { key: "action-know", category: "動作與狀態", meaning: "知道", recommended: "知影", sunoWriting: "災影", note: "災影可降低知被唱成華語 zhī 的機率。" },
  { key: "state-still", category: "動作與狀態", meaning: "猶原（仍舊）", recommended: "猶原", sunoWriting: "由緣／尤緣", note: "借音目標為 iû-guân，避免直接落成華語字音。" },
  { key: "state-daydream", category: "情緒與口語", meaning: "還在空想", recommended: "閣咧枵想", sunoWriting: "擱勒肖想", note: "擱通常比閣更容易帶出 koh 的聲音。" },
  { key: "object-mouthful", category: "動作與狀態", meaning: "一口", recommended: "一喙", sunoWriting: "一喙", note: "發音 tsi̍t-tshuì。" },
  { key: "action-walk", category: "動作與狀態", meaning: "走", recommended: "行", sunoWriting: "行", note: "台語走路常用行，發音 kiânn。" },
  { key: "action-turn-head", category: "動作與狀態", meaning: "轉頭", recommended: "越頭", sunoWriting: "越頭", note: "發音 ua̍t-thâu。" },
  { key: "state-cannot-lift", category: "動作與狀態", meaning: "提不起", recommended: "提袂起", sunoWriting: "提袂起", note: "袂用於不能，常見發音 bē／buē，仍需依旋律試唱。" },
  { key: "space-inside", category: "空間與疑問", meaning: "裡面", recommended: "內底", sunoWriting: "內底", note: "發音 lāi-té。" },
  { key: "action-want", category: "動作與狀態", meaning: "想要", recommended: "想欲", sunoWriting: "想寐", note: "想寐是為了連續唱感設計的借音寫法，建議和想欲一起測。" },
  { key: "time-that-night", category: "時間", meaning: "那一夜", recommended: "彼一暝", sunoWriting: "彼一眠", note: "彼一眠在歌唱中可能帶出較綿延的尾音。" },
  { key: "time-now", category: "時間", meaning: "現在", recommended: "這馬／此時", sunoWriting: "幾罵欸", note: "幾罵欸是常見華語擬音實驗寫法，目標聲音為 tsit-má。" },
  { key: "action-and", category: "動作與狀態", meaning: "和", recommended: "佮", sunoWriting: "尬", note: "以尬借音，目標是 kah。" },
  { key: "action-together", category: "動作與狀態", meaning: "一起", recommended: "做陣", sunoWriting: "作陣", note: "做陣／作陣讀 tsò-tīn，是常見台語歌用語。" },
  { key: "phrase-like-this", category: "情緒與口語", meaning: "就這樣", recommended: "按呢／就按呢", sunoWriting: "丟-án-ne", note: "混合羅馬字 án-ne 可減少按呢被照華語字面唱出的情況。" },
  { key: "object-eyes", category: "動作與狀態", meaning: "眼睛", recommended: "目睭", sunoWriting: "目睭", note: "發音 ba̍k-tsiu。" },
  { key: "state-cannot-open", category: "動作與狀態", meaning: "張不開", recommended: "擘袂開", sunoWriting: "背袂開", note: "背袂開是協助唱出 peh-bē-khui 的借音寫法。" },
  { key: "state-all-seem", category: "情緒與口語", meaning: "都像是", recommended: "攏親像", sunoWriting: "攏親像", note: "發音 lóng tshin-tshiūnn。" },
  { key: "phrase-forget-it", category: "情緒與口語", meaning: "忘記吧", recommended: "放予袂記", sunoWriting: "棒吼袂記", note: "棒吼袂記是為放予袂記設計的借音寫法。" },
  { key: "state-beautiful", category: "情緒與口語", meaning: "漂亮", recommended: "媠（suí）", sunoWriting: "suí", note: "直接使用羅馬字 suí，通常更容易唱出媠的聲音。" },
  { key: "state-no-longer", category: "動作與狀態", meaning: "不再", recommended: "莫閣／袂閣", sunoWriting: "賣閣", note: "賣閣用來靠近 mài-koh 的唱法。" },
  { key: "state-cannot-stop", category: "動作與狀態", meaning: "停不下來", recommended: "停袂落去", sunoWriting: "停袂落去", note: "發音 thîng-bē-lo̍h-khì。" },
  { key: "action-drink-dry", category: "情緒與口語", meaning: "喝乾杯", recommended: "啉予焦", sunoWriting: "拎吼搭", note: "借音目標為 līn-hōo-ta，適合乾杯與喝乾的歌詞語境。" },
  { key: "phrase-no-force", category: "情緒與口語", meaning: "不用勉強", recommended: "毋免勉強", sunoWriting: "毋免勉強", note: "發音 m̄-bián bián-kióng。" },
  { key: "question-could-it-be", category: "空間與疑問", meaning: "難道", recommended: "敢講", sunoWriting: "剛供", note: "剛供是為 kám-kóng 設計的借音寫法。" },
  { key: "question-what", category: "空間與疑問", meaning: "什麼", recommended: "啥物", sunoWriting: "瞎咪／啥米", note: "流行歌中常用瞎咪或啥米試出 siánn-mih 的唱感。" },
  { key: "action-play-music", category: "情緒與口語", meaning: "放歌", recommended: "播歌／放歌", sunoWriting: "棒瓜", note: "棒瓜用來靠近 bàng-kua，適合 DJ 放歌語境。" },
  { key: "space-where", category: "空間與疑問", meaning: "哪裡", recommended: "佗位", sunoWriting: "佗位", note: "發音 tó-uī。" },
];
