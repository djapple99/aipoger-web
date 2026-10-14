export type CreatorUploadQuota = {
  used: number;
  limit: number | null;
  unlimited: boolean;
  resetsAt: string | null;
  serverNow: string;
  creditEnabled?: boolean; balance?: number; debt?: number; extraCost?: number; canSubmit?: boolean;
};

export function parseCreatorUploadQuota(value: unknown): CreatorUploadQuota | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!Number.isInteger(row.used) || typeof row.serverNow !== "string" ||
      !Number.isFinite(Date.parse(row.serverNow)) ||
      !(row.resetsAt === null || (typeof row.resetsAt === "string" && Number.isFinite(Date.parse(row.resetsAt))))) return null;
  const unlimited = row.unlimited === true;
  const participation = row.creditEnabled === true && Number.isSafeInteger(row.balance) && (row.balance as number) >= 0
    && Number.isSafeInteger(row.debt) && (row.debt as number) >= 0 && row.extraCost === 60 && typeof row.canSubmit === "boolean";
  if (unlimited ? row.limit !== null || row.used !== 0 || row.resetsAt !== null
    : row.limit !== 3 || (row.used as number) < 0 || ((row.used as number) > 3 && !participation) ||
      (row.unlimited !== undefined && row.unlimited !== false)) return null;
  return { used: row.used as number, limit: row.limit as number | null,
    unlimited, resetsAt: row.resetsAt as string | null, serverNow: row.serverNow,
    ...(participation ? { creditEnabled:true,balance:row.balance as number,debt:row.debt as number,extraCost:60,canSubmit:row.canSubmit as boolean } : {}) };
}

export function creatorUploadLimitReached(quota: CreatorUploadQuota | null): boolean {
  return quota !== null && quota.unlimited !== true && quota.limit !== null && quota.used >= quota.limit && !(quota.creditEnabled && quota.canSubmit && (quota.debt ?? 0) === 0 && (quota.balance ?? 0) >= 60);
}
