import { encodeGenreSample, GENRE_SAMPLE_RATE, genreSampleWindows } from "./genre-suggestion";

export async function prepareGenreSample(file: File, signal: AbortSignal): Promise<ArrayBuffer> {
  signal.throwIfAborted();
  // Offline contexts do not play audio or compete with the site's player.
  const decoder = new OfflineAudioContext(1, 1, GENRE_SAMPLE_RATE);
  const audio = await decoder.decodeAudioData(await file.arrayBuffer());
  signal.throwIfAborted();
  const windows = genreSampleWindows(audio.duration);
  const frames = windows.reduce((sum, window) => sum + Math.floor(window.duration * GENRE_SAMPLE_RATE), 0);
  const renderer = new OfflineAudioContext(1, frames, GENRE_SAMPLE_RATE);
  let destination = 0;
  for (const window of windows) {
    const source = renderer.createBufferSource();
    source.buffer = audio;
    source.connect(renderer.destination);
    source.start(destination, window.start, window.duration);
    destination += window.duration;
  }
  const rendered = await renderer.startRendering();
  signal.throwIfAborted();
  return encodeGenreSample(rendered.getChannelData(0));
}
