import { MUSIC_GENRE_VALUES } from "./music-genres.ts";

export const GENRE_SAMPLE_RATE = 22050;
export const GENRE_SAMPLE_SECONDS = 21;
export const GENRE_SAMPLE_MAX_BYTES = 44 + GENRE_SAMPLE_RATE * GENRE_SAMPLE_SECONDS * 2;

export type GenreSuggestion = { genres: string[]; source: "audio" };

// Never canonicalize unknown predictions into Original or accept arbitrary model text.
export function parseGenreSuggestion(value: unknown): GenreSuggestion | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.source !== "audio" || !Array.isArray(result.genres) || result.genres.length > 3) return null;
  if (!result.genres.every(genre => typeof genre === "string" && MUSIC_GENRE_VALUES.includes(genre))) return null;
  return { source: "audio", genres: [...new Set(result.genres)] };
}

export function genreSampleWindows(duration: number): { start: number; duration: number }[] {
  if (!Number.isFinite(duration) || duration < 3) throw new Error("Audio too short");
  if (duration <= GENRE_SAMPLE_SECONDS) return [{ start: 0, duration }];
  return [0.15, 0.5, 0.85].map(position => ({ start: Math.min(duration - 7, Math.max(0, duration * position - 3.5)), duration: 7 }));
}

export function encodeGenreSample(samples: Float32Array): ArrayBuffer {
  if (!samples.length || samples.length > GENRE_SAMPLE_RATE * GENRE_SAMPLE_SECONDS) throw new Error("Invalid sample length");
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8, "WAVE");
  text(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, GENRE_SAMPLE_RATE, true);
  view.setUint32(28, GENRE_SAMPLE_RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, index) => {
    const sample = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    view.setInt16(44 + index * 2, sample * (sample < 0 ? 32768 : 32767), true);
  });
  return buffer;
}

// Canonical, bounded WAV only: protects the analysis service from oversized/encoded payloads.
export function isGenreSample(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 44 + GENRE_SAMPLE_RATE * 3 * 2 || buffer.byteLength > GENRE_SAMPLE_MAX_BYTES || buffer.byteLength % 2) return false;
  const view = new DataView(buffer);
  const text = (start: number, length: number) => String.fromCharCode(...new Uint8Array(buffer, start, length));
  return text(0, 4) === "RIFF" && text(8, 4) === "WAVE" && text(12, 4) === "fmt " && text(36, 4) === "data"
    && view.getUint32(4, true) === buffer.byteLength - 8 && view.getUint32(16, true) === 16
    && view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1
    && view.getUint32(24, true) === GENRE_SAMPLE_RATE && view.getUint32(28, true) === GENRE_SAMPLE_RATE * 2
    && view.getUint16(32, true) === 2 && view.getUint16(34, true) === 16 && view.getUint32(40, true) === buffer.byteLength - 44;
}
