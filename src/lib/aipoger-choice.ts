export const AIPOGER_CHOICE_MIN_ITEMS = 5;
export const AIPOGER_CHOICE_MAX_ITEMS = 10;

export const AIPOGER_CHOICE_SOURCE_KINDS = ["listen_bar_track", "battle_archive"] as const;
export type AipogerChoiceSourceKind = (typeof AIPOGER_CHOICE_SOURCE_KINDS)[number];

export type AipogerChoiceCatalogItem = {
  id: string;
  sourceKind: AipogerChoiceSourceKind;
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  recognition: string;
  certifiedAt: string;
  isPublic: boolean;
  selectable: boolean;
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
  items: AipogerChoiceItem[];
};

export function choiceWeekStart(value: Date = new Date()) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function isAipogerChoiceSourceKind(value: unknown): value is AipogerChoiceSourceKind {
  return AIPOGER_CHOICE_SOURCE_KINDS.includes(value as AipogerChoiceSourceKind);
}

export function choiceItemCountMessage(count: number, isZh = true) {
  const safeCount = Math.max(0, Math.round(count));
  if (safeCount < AIPOGER_CHOICE_MIN_ITEMS) {
    const remaining = AIPOGER_CHOICE_MIN_ITEMS - safeCount;
    return isZh
      ? `還要加入 ${remaining} 首 Showtime 作品才能發布。`
      : `Add ${remaining} more Showtime work${remaining === 1 ? "" : "s"} before publishing.`;
  }
  if (safeCount > AIPOGER_CHOICE_MAX_ITEMS) {
    return isZh ? "Choice 每週最多 10 首。" : "Choice allows at most 10 works per week.";
  }
  return isZh ? `可發布：${safeCount} 首人工策展作品。` : `Ready to publish: ${safeCount} human-curated works.`;
}
