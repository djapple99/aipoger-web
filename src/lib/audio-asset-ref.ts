export const AUDIO_STAGING_BUCKET = 'pending-audio';
export const AUDIO_VERIFIED_BUCKET = 'verified-audio';
export function audioAssetUrl(id: string) { return `https://aipoger.com/api/audio-assets/${id}`; }
export function audioAssetId(value: unknown) {
  if (typeof value !== 'string') return null;
  return /^https:\/\/aipoger\.com\/api\/audio-assets\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(value)?.[1]?.toLowerCase() ?? null;
}
