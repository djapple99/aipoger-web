export function nextMusicIndex(index: number, length: number, repeat = false): number | null {
  if (length <= 0 || index < 0 || index >= length) return null;
  if (index + 1 < length) return index + 1;
  return repeat ? 0 : null;
}
export function playableMusicQueue<T extends { id: string; audioUrl: string; youtubeId?: string }>(queue: T[], requestedIndex = 0) {
  const playable = queue.filter(track => Boolean(track.audioUrl || (track.youtubeId && /^[\w-]{11}$/.test(track.youtubeId))));
  const selectedId = queue[requestedIndex]?.id;
  return { queue: playable, index: Math.max(0, playable.findIndex(track => track.id === selectedId)) };
}

/** Shuffle a copy: every eligible song occurs once before the radio repeats. */
export function shuffleMusicQueue<T>(tracks: readonly T[], random = Math.random): T[] {
  const queue = [...tracks];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}
