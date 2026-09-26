export function listeningTrackId(track: { id: string; heartTrackId?: string }) {
  const id = track.heartTrackId || track.id.replace(/^listen_bar_track:/, "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

// One measurement survives pause/resume; a queue advance starts another.
export function createListeningMeasurement(id: string, intentional: boolean, startedAt: string) {
  let anchor: { position: number; wall: number } | null = null;
  let intervals: [number, number][] = [];
  let seconds = 0;
  let lastReported = 0;
  const reset = () => { anchor = null; };
  return {
    reset,
    sample(position: number, wall: number, rate = 1) {
      if (!Number.isFinite(position) || !Number.isFinite(wall)) { reset(); return; }
      if (anchor) {
        const delta = position - anchor.position;
        const elapsed = (wall - anchor.wall) / 1000;
        if (delta > 0 && elapsed > 0 && elapsed <= 5 && delta <= elapsed * rate + 0.25) {
          seconds += delta;
          intervals.push([anchor.position, position]);
          intervals.sort((a, b) => a[0] - b[0]);
          const merged: [number, number][] = [];
          for (const interval of intervals) {
            const previous = merged.at(-1);
            if (previous && interval[0] <= previous[1] + 0.05) previous[1] = Math.max(previous[1], interval[1]);
            else merged.push([...interval]);
          }
          intervals = merged;
        }
      }
      anchor = { position, wall };
    },
    due() { if (seconds - lastReported < 15) return false; lastReported = seconds; return true; },
    snapshot(duration: number) {
      return { listeningVersion: 1, playbackId: id, intentional, startedAt,
        listenedSeconds: Math.floor(seconds),
        coveredSeconds: Math.floor(intervals.reduce((sum, [start, end]) => sum + end - start, 0)),
        durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null };
    },
  };
}
