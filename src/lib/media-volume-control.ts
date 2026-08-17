export type MediaVolumeTarget = {
  volume: number;
};

export function clampMediaVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function setNativeMediaVolume(target: MediaVolumeTarget, value: number): boolean {
  const nextVolume = clampMediaVolume(value);

  try {
    target.volume = nextVolume;
    return Math.abs(target.volume - nextVolume) <= 0.01;
  } catch {
    return false;
  }
}
