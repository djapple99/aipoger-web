// Archive browsing follows the viewer's calendar, as the date labels do.
export function battleRecordMonth(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

type MonthlyRecord = {
  archivedAt: string;
  mode: "q_crash" | "drop_battle";
  votesTotal: number;
  audienceCount: number;
};

export function monthlyBattleSummary<T extends MonthlyRecord>(records: T[], month: string) {
  const monthRecords = records.filter((record) => battleRecordMonth(record.archivedAt) === month);
  return {
    monthRecords,
    qCrashRecords: monthRecords.filter((record) => record.mode === "q_crash"),
    dropMonthRecords: monthRecords.filter((record) => record.mode !== "q_crash"),
    totalVotes: monthRecords.reduce((sum, record) => sum + record.votesTotal, 0),
    totalAudience: monthRecords.reduce((sum, record) => sum + record.audienceCount, 0),
  };
}

export function leadingVoteShare(left: number, right: number) {
  const total = left + right;
  return total > 0 ? Math.round((Math.max(left, right) / total) * 100) : null;
}
