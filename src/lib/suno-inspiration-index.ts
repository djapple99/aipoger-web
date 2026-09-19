import { SUNO_ARTIST_DNA_RAW } from "./suno-artist-dna-data.ts";
import { SUNO_PROMPT_RECIPE_RAW, SUNO_RECIPE_DIMENSIONS } from "./suno-prompt-recipe-data.ts";

export type SunoInspirationKind = "artist_dna" | "prompt_recipe";

export type SunoArtistDnaEntry = {
  key: string;
  artist: string;
  source: "encyclopedia" | "aipoger";
  sourcePage: number | null;
  sourcePrompt?: string;
  tags: readonly string[];
  summaryZh: readonly string[];
  prompt: string;
  searchText: string;
};

export type SunoPromptRecipe = {
  key: string;
  sourceIndex: number;
  genre: string;
  genreZh: string;
  vocal: string;
  vocalZh: string;
  mood: string;
  moodZh: string;
  instrument: string;
  instrumentZh: string;
  story: string;
  storyZh: string;
  texture: string;
  textureZh: string;
  prompt: string;
  searchText: string;
};

type KeywordRule = readonly [RegExp, string];

const GENRE_RULES: readonly KeywordRule[] = [
  [/r&b|rhythm and blues/i, "節奏藍調"],
  [/hip-hop|hip hop|rap\b|trap\b/i, "嘻哈／饒舌"],
  [/country|americana|bluegrass|bakersfield/i, "鄉村／美式根源"],
  [/metal|grindcore|deathcore/i, "金屬"],
  [/punk|hardcore|emo\b/i, "龐克／硬蕊"],
  [/rock|grunge|shoegaze/i, "搖滾"],
  [/jazz|swing|bebop/i, "爵士"],
  [/blues/i, "藍調"],
  [/soul|motown|funk/i, "靈魂／放克"],
  [/electronic|electronica|trance|techno|house|synth|ambient|dance/i, "電子音樂"],
  [/folk|acoustic|singer-songwriter/i, "民謠／原聲"],
  [/classical|orchestral|operatic|chamber/i, "古典／管弦"],
  [/reggae|ska\b|dub\b/i, "雷鬼／斯卡"],
  [/latin|salsa|bossa|flamenco|tango/i, "拉丁／巴薩諾瓦"],
  [/gospel|worship|christian/i, "福音／敬拜"],
  [/afro|world|global/i, "世界音樂"],
  [/pop/i, "流行"],
] as const;

const VOCAL_RULES: readonly KeywordRule[] = [
  [/instrumental|producer|dj\b/i, "樂器／製作主導"],
  [/harmon|group vocal|choir|duet/i, "和聲／群唱"],
  [/powerhouse|soaring|powerful|belting/i, "強力高張力人聲"],
  [/raspy|gritty|smoky|raw vocal|growl|scream/i, "沙啞顆粒人聲"],
  [/smooth|soft vocal|velvety|silky|gentle vocal|airy|breathy/i, "柔滑細膩人聲"],
  [/female vocal/i, "女性主唱"],
  [/male vocal|tenor|baritone/i, "男性主唱"],
] as const;

const ARRANGEMENT_RULES: readonly KeywordRule[] = [
  [/guitar|riff|shredd/i, "吉他主導"],
  [/piano|keyboard/i, "鋼琴／鍵盤主導"],
  [/synth|electronic beat|electronic production/i, "合成器電子編曲"],
  [/orchestral|strings|violin|cello/i, "弦樂／管弦層次"],
  [/percussion|drum|beat/i, "節奏打擊主導"],
  [/bass|groove/i, "低頻律動主導"],
  [/acoustic|fiddle|steel guitar/i, "原聲器樂質感"],
] as const;

const MOOD_RULES: readonly KeywordRule[] = [
  [/dark|haunting|brooding|moody|gothic/i, "暗黑氛圍"],
  [/romantic|emotional|heartfelt|emotive|confessional/i, "情感敘事"],
  [/uplifting|energetic|anthemic|arena|dancefloor/i, "高能量副歌"],
  [/dreamy|atmospheric|ethereal|cinematic|spacious/i, "夢幻空間"],
  [/retro|vintage|nostalgic|\b[5-9]0s\b|2000s/i, "年代復古質感"],
] as const;

function classify(text: string, rules: readonly KeywordRule[], fallback: string) {
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}

function cleanTag(tag: string) {
  return tag.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
}

const SUNO_ENCYCLOPEDIA_ARTIST_DNA_ENTRIES: readonly SunoArtistDnaEntry[] = SUNO_ARTIST_DNA_RAW.map(
  ([artist, sourcePage, genre, vocal, arrangement, mood], index) => {
    const tags = [genre, vocal, arrangement, mood].map(cleanTag);
    const joined = tags.join(", ");
    const summaryZh = [
      classify(joined, GENRE_RULES, "跨界風格"),
      classify(joined, VOCAL_RULES, "敘事型人聲"),
      classify(joined, ARRANGEMENT_RULES, "標誌性編曲"),
      classify(joined, MOOD_RULES, "鮮明作品氣質"),
    ];
    return {
      key: "artist-dna-" + String(index + 1).padStart(3, "0"),
      artist,
      source: "encyclopedia",
      sourcePage,
      tags,
      summaryZh,
      prompt: joined + ", original composition, no direct artist imitation",
      searchText: [artist, joined, ...summaryZh].join(" ").toLocaleLowerCase(),
    };
  },
);

const JOCELYN_BROWN_SOURCE_PROMPT = "A powerhouse, soulful female lead vocal, delivered in the iconic, unmistakable style of Jocelyn Brown, Her voice is strong, full-bodied, and rich, with a distinctive gritty texture and commanding, passionate delivery, Emphasize her signature belting, energetic";

const SUNO_AIPOGER_ARTIST_DNA_ENTRIES: readonly SunoArtistDnaEntry[] = [
  {
    key: "artist-dna-aipoger-001",
    artist: "Jocelyn Brown",
    source: "aipoger",
    sourcePage: null,
    sourcePrompt: JOCELYN_BROWN_SOURCE_PROMPT,
    tags: [
      "Electronic dance / gospel house",
      "powerhouse soulful female lead vocal with a strong, full-bodied, rich tone",
      "distinctive gritty texture, commanding passionate delivery, emphatic chest-led belting",
      "energetic high-impact chorus lift",
    ],
    summaryZh: ["電子音樂", "強力高張力人聲", "合成器電子編曲", "高能量副歌"],
    prompt: "electronic dance and gospel house, powerhouse soulful female lead vocal, strong full-bodied rich tone, distinctive gritty texture, commanding passionate delivery, emphatic chest-led belting, energetic high-impact chorus lift, original vocal identity, no direct artist imitation",
    searchText: [
      "Jocelyn Brown",
      "electronic dance gospel house soulful female lead vocal powerhouse full-bodied rich gritty belting energetic",
      "電子音樂 強力高張力人聲 合成器電子編曲 高能量副歌 靈魂女聲 沙啞 顆粒 爆發力",
      JOCELYN_BROWN_SOURCE_PROMPT,
    ].join(" ").toLocaleLowerCase(),
  },
];

export const SUNO_ARTIST_DNA_ENTRIES: readonly SunoArtistDnaEntry[] = [
  ...SUNO_ENCYCLOPEDIA_ARTIST_DNA_ENTRIES,
  ...SUNO_AIPOGER_ARTIST_DNA_ENTRIES,
];

const RECIPE_ZH = {
  genres: {
    "cinematic ambient": "電影感氛圍",
    "indie folk": "獨立民謠",
    "electric blues": "電氣藍調",
    "neo-soul": "新靈魂",
    "Delta blues": "三角洲藍調",
    "lofi hip-hop": "低傳真嘻哈",
    "modern soul": "現代靈魂",
    "smooth jazz": "柔順爵士",
    "classic R&B": "經典節奏藍調",
    "dream-pop": "夢幻流行",
  },
  vocals: {
    "deep storytelling tone": "深沉敘事口吻",
    "expressive raspy vocals": "有表情的沙啞人聲",
    "soft emotional delivery": "柔和情感唱法",
    "warm airy vocals": "溫暖空氣感人聲",
    "silky soulful phrasing": "絲滑靈魂樂句",
  },
  moods: {
    "warm dreamy glow": "溫暖夢幻光澤",
    "uplifting energetic feel": "振奮高能量",
    "mysterious cinematic vibe": "神祕電影氛圍",
    "romantic nighttime mood": "浪漫夜色情緒",
    "melancholic emotional tone": "憂鬱情感色調",
  },
  instruments: {
    "gentle percussion layers": "輕柔打擊層次",
    "soft piano chords": "柔和鋼琴和弦",
    "dusty electric guitar": "帶塵感電吉他",
    "deep bass groove": "深沉低頻律動",
    "warm vintage synths": "溫暖復古合成器",
  },
  stories: {
    "personal breakthrough": "個人突破",
    "long-lost memory": "久遠記憶",
    "quiet confession": "安靜告白",
    "moment of clarity": "豁然開朗的瞬間",
    "bittersweet reflection": "苦甜回望",
  },
  textures: {
    "film-noir shadow lighting": "黑色電影陰影質感",
    "wide cinematic panorama": "寬幅電影全景",
    "glassy ambient textures": "玻璃感氛圍紋理",
    "foggy city ambience": "霧城市景氛圍",
    "sunset haze atmosphere": "夕照薄霧氛圍",
  },
} as const;

function translated<
  Group extends keyof typeof RECIPE_ZH,
  Value extends keyof (typeof RECIPE_ZH)[Group],
>(group: Group, value: Value) {
  return RECIPE_ZH[group][value];
}

export const SUNO_PROMPT_RECIPES: readonly SunoPromptRecipe[] = SUNO_PROMPT_RECIPE_RAW.map(
  ([sourceIndex, genreIndex, vocalIndex, moodIndex, instrumentIndex, storyIndex, textureIndex], index) => {
    const genre = SUNO_RECIPE_DIMENSIONS.genres[genreIndex];
    const vocal = SUNO_RECIPE_DIMENSIONS.vocals[vocalIndex];
    const mood = SUNO_RECIPE_DIMENSIONS.moods[moodIndex];
    const instrument = SUNO_RECIPE_DIMENSIONS.instruments[instrumentIndex];
    const story = SUNO_RECIPE_DIMENSIONS.stories[storyIndex];
    const texture = SUNO_RECIPE_DIMENSIONS.textures[textureIndex];
    const genreZh = translated("genres", genre);
    const vocalZh = translated("vocals", vocal);
    const moodZh = translated("moods", mood);
    const instrumentZh = translated("instruments", instrument);
    const storyZh = translated("stories", story);
    const textureZh = translated("textures", texture);
    const prompt = [
      genre,
      vocal,
      mood,
      instrument,
      "story: " + story,
      texture,
      "emotional storytelling",
      "cinematic arrangement",
    ].join(", ");
    return {
      key: "prompt-recipe-" + String(index + 1).padStart(3, "0"),
      sourceIndex,
      genre,
      genreZh,
      vocal,
      vocalZh,
      mood,
      moodZh,
      instrument,
      instrumentZh,
      story,
      storyZh,
      texture,
      textureZh,
      prompt,
      searchText: [
        genre,
        genreZh,
        vocal,
        vocalZh,
        mood,
        moodZh,
        instrument,
        instrumentZh,
        story,
        storyZh,
        texture,
        textureZh,
      ].join(" ").toLocaleLowerCase(),
    };
  },
);

export const SUNO_RECIPE_GENRES = SUNO_RECIPE_DIMENSIONS.genres.map((genre) => ({
  key: genre,
  zh: translated("genres", genre),
  en: genre,
}));

const ARTIST_KEYS = new Set(SUNO_ARTIST_DNA_ENTRIES.map((entry) => entry.key));
const RECIPE_KEYS = new Set(SUNO_PROMPT_RECIPES.map((entry) => entry.key));

export function isSunoInspirationEntry(kind: SunoInspirationKind, key: string) {
  return kind === "artist_dna" ? ARTIST_KEYS.has(key) : RECIPE_KEYS.has(key);
}

export const SUNO_INSPIRATION_SOURCE = {
  artist: {
    title: "Suno AI — Full Artist Encyclopedia",
    suppliedEntries: 771,
    curatedEntries: 1,
    canonicalEntries: 772,
    sourcePages: 40,
  },
  recipes: {
    title: "750 Music Prompts",
    suppliedEntries: 750,
    canonicalEntries: 747,
    exactDuplicatesRemoved: 3,
    sourcePages: 82,
  },
} as const;
