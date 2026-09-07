export function nextMusicIndex(index: number, length: number, repeat = false): number | null {
  if (length <= 0 || index < 0 || index >= length) return null;
  if (index + 1 < length) return index + 1;
  return repeat ? 0 : null;
}
export function playableMusicQueue<T extends { id: string; audioUrl: string }>(queue: T[], requestedIndex = 0) {
  const playable = queue.filter(track => Boolean(track.audioUrl));
  const selectedId = queue[requestedIndex]?.id;
  return { queue: playable, index: Math.max(0, playable.findIndex(track => track.id === selectedId)) };
}
