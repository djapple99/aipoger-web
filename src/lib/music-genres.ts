export type MusicGenreOption = {
  value: string;
  labelKey: string;
};

export const MUSIC_GENRE_OPTIONS: MusicGenreOption[] = [
  { value: "K-pop動感風", labelKey: "genre_kpop_energy" },
  { value: "說唱街頭風", labelKey: "genre_rap_street" },
  { value: "復古City-Pop", labelKey: "genre_city_pop" },
  { value: "感人抒情", labelKey: "genre_emotion" },
  { value: "熱血搖滾", labelKey: "genre_rock" },
  { value: "動感電音", labelKey: "genre_edm" },
  { value: "自我風格", labelKey: "genre_custom" },
];
