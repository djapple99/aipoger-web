export function isTextEditingTarget(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (!element || typeof element.closest !== "function") return false;

  const editable = element.closest("textarea,input,select,[contenteditable],[role='textbox']");
  if (!editable) return false;

  const tagName = editable.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "input" || tagName === "select") return true;
  if (editable.getAttribute("role") === "textbox") return true;
  return editable.getAttribute("contenteditable") !== "false";
}

export function shouldHandleDropCutSpaceShortcut(event: KeyboardEvent): boolean {
  const isSpace = event.key === " " || event.key === "Spacebar" || event.code === "Space";
  return Boolean(
    isSpace &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.isComposing &&
      !isTextEditingTarget(event.target),
  );
}
