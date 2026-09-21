import type { AipogerChoiceCatalogItem } from "./aipoger-choice";

export const choiceEditorKey = (item: { sourceKind: string; id: string }) => `${item.sourceKind}:${item.id}`;
export const choiceEditorItems = (items: { sourceKind: string; id: string }[]) => items.map(item => ({ sourceKind: item.sourceKind, sourceId: item.id }));

export function choiceEditorSnapshot(collection: { weekStart: string; title: string; intro: string; isPublished: boolean; items: { sourceKind: string; id: string }[] }) {
  return { weekStart: collection.weekStart, title: collection.title, intro: collection.intro,
    isPublished: collection.isPublished, items: choiceEditorItems(collection.items) };
}

export function toggleChoiceSelection<T extends AipogerChoiceCatalogItem>(items: T[], item: T): T[] {
  const key = choiceEditorKey(item);
  if (items.some(value => choiceEditorKey(value) === key)) return items.filter(value => choiceEditorKey(value) !== key);
  if (items.length >= 10 || !item.selectable || !item.isPublic || !item.audioUrl) return items;
  return [...items, item];
}

export function moveChoiceToPosition<T>(items: T[], from: number, position: number): T[] {
  if (!Number.isInteger(position) || position < 1 || position > items.length || from < 0 || from >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(position - 1, 0, item);
  return next;
}
