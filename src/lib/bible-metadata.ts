/** Lifecycle is independent from historical source/evidence labels. */
export const BIBLE_STATUSES = ["Verified", "Experimental", "Legacy", "Deprecated"] as const;
export type BibleStatus = typeof BIBLE_STATUSES[number];
export type BibleMetadata = {
  platform: string;
  model: string | null;
  modelVersion: string | null;
  lastVerifiedAt: string | null;
  status: BibleStatus;
};

export function legacyBibleMetadata(): BibleMetadata {
  return { platform: "Suno", model: null, modelVersion: null, lastVerifiedAt: null, status: "Legacy" };
}

export function withBibleMetadata<T extends { metadata?: BibleMetadata }>(item: T): T & { metadata: BibleMetadata } {
  return { ...item, metadata: item.metadata ?? legacyBibleMetadata() };
}

/** A complete replacement, with explicit nulls for unknown/cleared values. */
export function sanitizeBibleMetadata(value: unknown): BibleMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const text = (value: unknown) => typeof value === "string" && value.trim() && value.trim().length <= 120 ? value.trim() : null;
  const platform = text(input.platform);
  const model = input.model === null ? null : text(input.model);
  const modelVersion = input.modelVersion === null ? null : text(input.modelVersion);
  if (!platform || (input.model !== null && !model) || (input.modelVersion !== null && !modelVersion)) return null;
  if (!BIBLE_STATUSES.includes(input.status as BibleStatus)) return null;
  const date = input.lastVerifiedAt;
  if (date !== null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return null;
  if (input.status === "Verified" && (!model || !modelVersion || !date)) return null;
  return { platform, model, modelVersion, lastVerifiedAt: date as string | null, status: input.status as BibleStatus };
}
