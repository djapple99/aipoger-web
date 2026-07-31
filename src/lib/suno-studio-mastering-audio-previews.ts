export type SunoStudioMasteringAudioPreview = {
  key: string;
  audioUrl: string;
};

const SUNO_STUDIO_MASTERING_AUDIO_PREVIEW_ASSETS = [
  ["studio-mastering-general", "general"],
  ["studio-mastering-acoustic-folk", "acoustic-folk"],
  ["studio-mastering-piano-pop", "piano-pop"],
  ["studio-mastering-dream-pop", "dream-pop"],
  ["studio-mastering-alt-rock", "alt-rock"],
  ["studio-mastering-pop-punk", "pop-punk"],
  ["studio-mastering-neo-soul", "neo-soul"],
  ["studio-mastering-hip-hop-trap", "hip-hop-trap"],
  ["studio-mastering-vocal-jazz", "vocal-jazz"],
  ["studio-mastering-nu-disco", "nu-disco"],
  ["studio-mastering-deep-house", "deep-house"],
  ["studio-mastering-melodic-techno", "melodic-techno"],
  ["studio-mastering-uplifting-trance", "uplifting-trance"],
  ["studio-mastering-liquid-dnb", "liquid-dnb"],
  ["studio-mastering-synthwave", "synthwave"],
  ["studio-mastering-orchestral-pop", "orchestral-pop"],
  ["studio-mastering-metalcore", "metalcore"],
  ["studio-mastering-afrobeat", "afrobeat-highlife"],
  ["studio-mastering-big-band-swing", "big-band-swing"],
  ["studio-mastering-bebop-hard-bop", "bebop-hard-bop"],
  ["studio-mastering-cool-jazz", "cool-jazz"],
  ["studio-mastering-bossa-nova-jazz", "bossa-nova-jazz"],
  ["studio-mastering-jazz-fusion", "jazz-fusion"],
  ["studio-mastering-acid-jazz", "acid-jazz"],
  ["studio-mastering-1950s-rockabilly", "1950s-rockabilly"],
  ["studio-mastering-1960s-motown-soul", "1960s-motown-soul"],
  ["studio-mastering-1960s-psychedelic-rock", "1960s-psychedelic-rock"],
  ["studio-mastering-1970s-soft-rock", "1970s-soft-rock"],
  ["studio-mastering-1970s-progressive-rock", "1970s-progressive-rock"],
  ["studio-mastering-1980s-new-wave", "1980s-new-wave"],
  ["studio-mastering-1980s-arena-rock", "1980s-arena-rock"],
  ["studio-mastering-1990s-grunge", "1990s-grunge"],
  ["studio-mastering-1990s-britpop", "1990s-britpop"],
  ["studio-mastering-2000s-indie-rock", "2000s-indie-rock"],
  ["studio-mastering-k-pop-dance", "k-pop-dance"],
  ["studio-mastering-chinese-gufeng", "chinese-gufeng"],
  ["studio-mastering-bollywood-pop", "bollywood-pop"],
  ["studio-mastering-indian-classical-fusion", "indian-classical-fusion"],
  ["studio-mastering-flamenco-pop", "flamenco-pop"],
  ["studio-mastering-french-chanson", "french-chanson"],
  ["studio-mastering-reggaeton", "reggaeton"],
  ["studio-mastering-amapiano", "amapiano"],
  ["studio-mastering-arabic-pop", "arabic-pop"],
  ["studio-mastering-full-symphony", "full-symphony"],
  ["studio-mastering-chamber-strings", "chamber-strings"],
  ["studio-mastering-symphonic-rock", "symphonic-rock"],
  ["studio-mastering-neoclassical-minimalism", "neoclassical-minimalism"],
  ["studio-mastering-chicago-blues", "chicago-blues"],
  ["studio-mastering-nashville-country-rock", "nashville-country-rock"],
  ["studio-mastering-gospel-choir", "gospel-choir"],
] as const;

export const SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS: readonly SunoStudioMasteringAudioPreview[] =
  SUNO_STUDIO_MASTERING_AUDIO_PREVIEW_ASSETS.map(([key, slug]) => ({
    key,
    audioUrl: `/audio/ai-music-bible/studio-mastering/${slug}.mp3`,
  }));

const AUDIO_PREVIEW_BY_KEY = new Map(
  SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.map((preview) => [preview.key, preview]),
);

export function getSunoStudioMasteringAudioPreview(key: string) {
  return AUDIO_PREVIEW_BY_KEY.get(key) ?? null;
}
