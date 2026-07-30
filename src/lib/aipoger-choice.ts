export const AIPOGER_CHOICE_MIN_ITEMS = 5;
export const AIPOGER_CHOICE_MAX_ITEMS = 10;
export const AIPOGER_CHOICE_INTRO_MAX_LENGTH = 3000;
export const AIPOGER_CHOICE_COMMENT_MAX_LENGTH = 280;
export const AIPOGER_CHOICE_NEW_RELEASE_WINDOW_DAYS = 30;
export const AIPOGER_CHOICE_NEW_RELEASE_WINDOW_MS = AIPOGER_CHOICE_NEW_RELEASE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export const AIPOGER_CHOICE_SOURCE_KINDS = ["listen_bar_track", "battle_archive"] as const;
export type AipogerChoiceSourceKind = (typeof AIPOGER_CHOICE_SOURCE_KINDS)[number];

export const AIPOGER_CHOICE_CATALOG_SOURCES = ["showtime", "new_release"] as const;
export type AipogerChoiceCatalogSource = (typeof AIPOGER_CHOICE_CATALOG_SOURCES)[number];

export const AIPOGER_CHOICE_CURATOR_IDENTITIES = ["official", "personal"] as const;
export type AipogerChoiceCuratorIdentity = (typeof AIPOGER_CHOICE_CURATOR_IDENTITIES)[number];

export type AipogerChoiceCatalogItem = {
  id: string;
  sourceKind: AipogerChoiceSourceKind;
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  recognition: string;
  certifiedAt: string;
  isPublic: boolean;
  selectable: boolean;
  choiceSource?: AipogerChoiceCatalogSource;
};

export type AipogerChoiceItem = AipogerChoiceCatalogItem & {
  itemId: string;
  position: number;
};

export type AipogerChoiceCollection = {
  id: string;
  weekStart: string;
  title: string;
  intro: string;
  isPublished: boolean;
  curatorIdentity?: AipogerChoiceCuratorIdentity;
  curatorName?: string;
  avatarUrl?: string;
  items: AipogerChoiceItem[];
};

export function choiceWeekStart(value: Date = new Date()) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function choicePublicPath(collectionId: string, kind: "official" | "creator" = "official") {
  return `/choice/${encodeURIComponent(collectionId)}?kind=${kind}`;
}

export function choiceItemRecordKey(item: Pick<AipogerChoiceItem, "sourceKind" | "id">) {
  const targetKind = item.sourceKind === "listen_bar_track" ? "bar" : "battle";
  return `${targetKind}:${item.id}`;
}

export function choiceDisplayTitle(curatorName: string | null | undefined, title: string | null | undefined) {
  const curator = curatorName?.trim() || "AIPOGER";
  const authoredTitle = title?.trim() || "";
  return authoredTitle || `${curator} Choice`;
}

export function isAipogerChoiceSourceKind(value: unknown): value is AipogerChoiceSourceKind {
  return AIPOGER_CHOICE_SOURCE_KINDS.includes(value as AipogerChoiceSourceKind);
}

export function isAipogerChoiceNewRelease(
  createdAt: string | null | undefined,
  now: Date = new Date(),
) {
  const createdAtMs = new Date(createdAt ?? "").getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs)) return false;

  const ageMs = nowMs - createdAtMs;
  return ageMs >= 0 && ageMs < AIPOGER_CHOICE_NEW_RELEASE_WINDOW_MS;
}

export function choiceItemCountMessage(count: number, isZh = true) {
  const safeCount = Math.max(0, Math.round(count));
  if (safeCount < AIPOGER_CHOICE_MIN_ITEMS) {
    const remaining = AIPOGER_CHOICE_MIN_ITEMS - safeCount;
    return isZh
      ? `還要加入 ${remaining} 首 Choice 作品才能發布。`
      : `Add ${remaining} more Choice track${remaining === 1 ? "" : "s"} before publishing.`;
  }
  if (safeCount > AIPOGER_CHOICE_MAX_ITEMS) {
    return isZh ? "Choice 每週最多 10 首。" : "Choice allows at most 10 works per week.";
  }
  return isZh ? `可發布：${safeCount} 首人工策展作品。` : `Ready to publish: ${safeCount} human-curated works.`;
}
