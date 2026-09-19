import test from "node:test";
import assert from "node:assert/strict";

const {
  isTextEditingTarget,
  shouldHandleDropCutSpaceShortcut,
} = await import("../src/lib/drop-cut-keyboard.ts");

function targetFor(tagName, attrs = {}) {
  return {
    closest(selector) {
      if (!selector.includes(tagName.toLowerCase()) && !selector.includes("[contenteditable]") && !selector.includes("[role='textbox']")) return null;
      return {
        tagName,
        getAttribute(name) {
          return attrs[name] ?? null;
        },
      };
    },
  };
}

function eventFor(overrides = {}) {
  return {
    key: " ",
    code: "Space",
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    isComposing: false,
    target: { closest: () => null },
    ...overrides,
  };
}

test("drop cut Space shortcut ignores every text-editing target", () => {
  for (const target of [
    targetFor("TEXTAREA"),
    targetFor("INPUT"),
    targetFor("SELECT"),
    targetFor("DIV", { contenteditable: "true" }),
    targetFor("DIV", { role: "textbox" }),
  ]) {
    assert.equal(isTextEditingTarget(target), true);
    assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ target })), false);
  }
});

test("drop cut Space shortcut only fires for plain Space without modifiers or IME composition", () => {
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor()), true);
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ metaKey: true })), false);
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ ctrlKey: true })), false);
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ altKey: true })), false);
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ isComposing: true })), false);
  assert.equal(shouldHandleDropCutSpaceShortcut(eventFor({ key: "Enter", code: "Enter" })), false);
});
