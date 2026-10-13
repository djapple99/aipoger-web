export type CreatorUploadQuota = {
  used: number;
  limit: number | null;
  unlimited: boolean;
  resetsAt: string | null;
  serverNow: string;
};

export function parseCreatorUploadQuota(value: unknown): CreatorUploadQuota | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!Number.isInteger(row.used) || typeof row.serverNow !== "string" ||
      !Number.isFinite(Date.parse(row.serverNow)) ||
      !(row.resetsAt === null || (typeof row.resetsAt === "string" && Number.isFinite(Date.parse(row.resetsAt))))) return null;
  const unlimited = row.unlimited === true;
  if (unlimited ? row.limit !== null || row.used !== 0 || row.resetsAt !== null
    : row.limit !== 3 || (row.used as number) < 0 || (row.used as number) > 3 ||
      (row.unlimited !== undefined && row.unlimited !== false)) return null;
  return { used: row.used as number, limit: row.limit as number | null,
    unlimited, resetsAt: row.resetsAt as string | null, serverNow: row.serverNow };
}

export function creatorUploadLimitReached(quota: CreatorUploadQuota | null): boolean {
  return quota !== null && quota.unlimited !== true && quota.limit !== null && quota.used >= quota.limit;
}
