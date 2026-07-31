export type SunoStudioMasteringAudioPreview = {
  key: string;
  audioUrl: string;
};

export const SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS: readonly SunoStudioMasteringAudioPreview[] = [
  {
    key: "studio-mastering-1990s-britpop",
    audioUrl: "/audio/ai-music-bible/studio-mastering/1990s-britpop.mp3",
  },
  {
    key: "studio-mastering-big-band-swing",
    audioUrl: "/audio/ai-music-bible/studio-mastering/big-band-swing.mp3",
  },
  {
    key: "studio-mastering-indian-classical-fusion",
    audioUrl: "/audio/ai-music-bible/studio-mastering/indian-classical-fusion.mp3",
  },
  {
    key: "studio-mastering-bossa-nova-jazz",
    audioUrl: "/audio/ai-music-bible/studio-mastering/bossa-nova-jazz.mp3",
  },
  {
    key: "studio-mastering-1960s-motown-soul",
    audioUrl: "/audio/ai-music-bible/studio-mastering/1960s-motown-soul.mp3",
  },
  {
    key: "studio-mastering-1980s-new-wave",
    audioUrl: "/audio/ai-music-bible/studio-mastering/1980s-new-wave.mp3",
  },
  {
    key: "studio-mastering-1990s-grunge",
    audioUrl: "/audio/ai-music-bible/studio-mastering/1990s-grunge.mp3",
  },
  {
    key: "studio-mastering-k-pop-dance",
    audioUrl: "/audio/ai-music-bible/studio-mastering/k-pop-dance.mp3",
  },
  {
    key: "studio-mastering-uplifting-trance",
    audioUrl: "/audio/ai-music-bible/studio-mastering/uplifting-trance.mp3",
  },
  {
    key: "studio-mastering-afrobeat",
    audioUrl: "/audio/ai-music-bible/studio-mastering/afrobeat-highlife.mp3",
  },
  {
    key: "studio-mastering-taiwanese-pop",
    audioUrl: "/audio/ai-music-bible/studio-mastering/taiwanese-pop.mp3",
  },
  {
    key: "studio-mastering-full-symphony",
    audioUrl: "/audio/ai-music-bible/studio-mastering/full-symphony.mp3",
  },
  {
    key: "studio-mastering-arabic-pop",
    audioUrl: "/audio/ai-music-bible/studio-mastering/arabic-pop.mp3",
  },
] as const;

const AUDIO_PREVIEW_BY_KEY = new Map(
  SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.map((preview) => [preview.key, preview]),
);

export function getSunoStudioMasteringAudioPreview(key: string) {
  return AUDIO_PREVIEW_BY_KEY.get(key) ?? null;
}
