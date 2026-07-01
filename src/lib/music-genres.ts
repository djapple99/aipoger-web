export type MusicGenreOption = {
  value: string;
  labelKey: string;
};

export const MUSIC_GENRE_OPTIONS: MusicGenreOption[] = [
  { value: "K-Pop 韓式動感", labelKey: "genre_kpop_energy" },
  { value: "Rap 街頭說唱", labelKey: "genre_rap_street" },
  { value: "City Pop / Disco / Funk 城市律動", labelKey: "genre_city_pop" },
  { value: "R&B 深情瞬間", labelKey: "genre_emotion" },
  { value: "Band Rock 熱血搖滾", labelKey: "genre_rock" },
  { value: "EDM 百大電音", labelKey: "genre_edm" },
  { value: "Jazz / Bossa 微醺時刻", labelKey: "genre_jazz_bossa" },
  { value: "心靈 Ambient 宇宙", labelKey: "genre_spiritual_ambient" },
  { value: "Chinese Fusion 新派古風", labelKey: "genre_chinese_fusion" },
  { value: "台語熊 High", labelKey: "genre_taiwanese_bear_high" },
  { value: "Original 自我風格", labelKey: "genre_custom" },
];
