export type AdminTargetRow = {
  id?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStandardUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function cleanAdminTargetId(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^#/, "");
  return trimmed || null;
}

export function resolveAdminTargetIdFromRows(value: unknown, rows: AdminTargetRow[]) {
  const target = cleanAdminTargetId(value);
  if (!target) return null;
  if (isStandardUuid(target)) return target;

  const normalized = target.toLowerCase();
  const matches = rows
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string" && id.toLowerCase().startsWith(normalized));

  return matches.length === 1 ? matches[0] : null;
}
