export type MusicGenreOption = {
  value: string;
  labelKey: string;
};

export const MUSIC_GENRE_OPTIONS: MusicGenreOption[] = [
  { value: "K-Pop 韓式動感", labelKey: "genre_kpop_energy" },
  { value: "Rap 街頭說唱", labelKey: "genre_rap_street" },
  { value: "Disco / Funk / City-Pop", labelKey: "genre_city_pop" },
  { value: "R&B 深情瞬間", labelKey: "genre_emotion" },
  { value: "Band Rock 熱血搖滾", labelKey: "genre_rock" },
  { value: "EDM 百大電音", labelKey: "genre_edm" },
  { value: "Jazz / Bossa 微醺時刻", labelKey: "genre_jazz_bossa" },
  { value: "Spiritual / Ambient 放鬆宇宙", labelKey: "genre_spiritual_ambient" },
  { value: "Chinese Fusion 新派古風", labelKey: "genre_chinese_fusion" },
  { value: "Original 自我風格", labelKey: "genre_custom" },
];

export const MUSIC_GENRE_VALUES = MUSIC_GENRE_OPTIONS.map((genre) => genre.value);

const CANONICAL_MUSIC_GENRE_BY_LOWERCASE = new Map(
  MUSIC_GENRE_VALUES.map((genre) => [genre.toLowerCase(), genre]),
);

const LEGACY_MUSIC_GENRE_ALIASES = new Map<string, string>([
  ["k-pop動感風", "K-Pop 韓式動感"],
  ["k-pop 動感風", "K-Pop 韓式動感"],
  ["kpop 韓式動感", "K-Pop 韓式動感"],
  ["說唱街頭風", "Rap 街頭說唱"],
  ["復古city-pop", "Disco / Funk / City-Pop"],
  ["復古 city-pop", "Disco / Funk / City-Pop"],
  ["city pop / disco / funk 城市律動", "Disco / Funk / City-Pop"],
  ["disco / funk / city-pop", "Disco / Funk / City-Pop"],
  ["感人抒情", "R&B 深情瞬間"],
  ["熱血搖滾", "Band Rock 熱血搖滾"],
  ["動感電音", "EDM 百大電音"],
  ["心靈 ambient 宇宙", "Spiritual / Ambient 放鬆宇宙"],
  ["spiritual ambient universe", "Spiritual / Ambient 放鬆宇宙"],
  ["台語熊 high", "Original 自我風格"],
  ["自我風格", "Original 自我風格"],
  ["custom style", "Original 自我風格"],
  ["ai music", "Original 自我風格"],
  ["pop", "Original 自我風格"],
]);

export function canonicalMusicGenre(value: string | null | undefined) {
  const clean = String(value || "").trim();
  if (!clean) return "Original 自我風格";
  const lower = clean.toLowerCase();
  return CANONICAL_MUSIC_GENRE_BY_LOWERCASE.get(lower) ?? LEGACY_MUSIC_GENRE_ALIASES.get(lower) ?? clean;
}

export function isCurrentMusicGenre(value: string | null | undefined) {
  return CANONICAL_MUSIC_GENRE_BY_LOWERCASE.has(String(value || "").trim().toLowerCase());
}
