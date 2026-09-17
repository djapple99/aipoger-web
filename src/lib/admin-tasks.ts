export const ADMIN_TASKS = [
  { id: "charts", href: "/admin/charts", label: "同票待裁定" },
  { id: "reports", href: "/admin/moderation", label: "作品檢舉" },
  { id: "comments", href: "/admin/comments", label: "評論檢舉" },
  { id: "social", href: "/admin/social", label: "社群待處理" },
] as const;

export type AdminTaskId = (typeof ADMIN_TASKS)[number]["id"];
export type AdminTasks = { counts: Record<AdminTaskId, number | null>; checkedAt: string };
export const adminTaskTotal = (data: AdminTasks | null) => data
  ? ADMIN_TASKS.reduce((sum, { id }) => sum + (data.counts[id] ?? 0), 0) : 0;

export function adminTaskLabel(lang: string, count: number) {
  return lang === "ja" ? `管理タスク ${count} 件` : lang === "ko" ? `관리 작업 ${count}건`
    : lang === "en" ? `${count} admin tasks` : `${count} 項後台待辦`;
}

export function mergeAdminTasks(previous: AdminTasks | null, next: AdminTasks): AdminTasks {
  // An unavailable source must not clear a previously known positive badge.
  return { ...next, counts: Object.fromEntries(ADMIN_TASKS.map(({ id }) =>
    [id, next.counts[id] ?? previous?.counts[id] ?? null])) as AdminTasks["counts"] };
}
