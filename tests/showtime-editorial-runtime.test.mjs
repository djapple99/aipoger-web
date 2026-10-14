import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadTs } from "./helpers/choice-runtime.mjs";

const code = ts.transpileModule(readFileSync(new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
function nodes(node) { return !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)]; }
function content(node) { return Array.isArray(node) ? node.map(content).join("") : node && typeof node === "object" ? content(node.props?.children) : node == null ? "" : String(node); }
const entry = (id, extra = {}) => ({ id, kind: "creator", curatorName: "Curator", title: id, weekStart: "2026-09-14", coverUrl: "/real-cover.png", intro: "Intro", items: [{ itemId: id, id, sourceKind: "listen_bar_track", title: `Song ${id}`, artist: "Artist", audioUrl: "/audio.mp3" }], ...extra });
function shelf() {
  const states = []; let cursor = 0;
  const loaded = { exports: {} };
  const modules = {
    react: { useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], (value) => { states[i] = value; }]; }, useEffect() {} },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react-dom": { createPortal: (node) => node }, "next/link": { __esModule: true, default: "Link" },
    "lucide-react": {}, "@/components/choice-comments-dialog": { __esModule: true, default: "Comments" },
    "@/components/share-button": { __esModule: true, default: "Share" },
    "@/components/aipoger-choice-cover": { AipogerChoiceCover: "Cover" },
    "@/lib/showtime-copy": loadTs("src/lib/showtime-copy.ts"), "./showtime.module.css": { __esModule: true, default: {} },
    "@/lib/aipoger-choice": loadTs("src/lib/aipoger-choice.ts"), "@/lib/choice-copy": loadTs("src/lib/choice-copy.ts"),
  };
  new Function("require", "module", "exports", "document", code)((key) => { assert.ok(key in modules, key); return modules[key]; }, loaded, loaded.exports, { body: {} });
  return (entries, featuredKey = null, options = {}) => {
    cursor = 0;
    return loaded.exports.default({ entries, featuredKey, chart: { type: "Chart", props: {} }, lang: "en", hearts: {}, heartBusy: {}, itemHearts: {}, itemHeartBusy: {}, onPlay() {}, onToggleHeart() {}, onToggleItemHeart() {}, ...options });
  };
}
test("valid owner feature leads without ranking Choices or duplicating a visible lead", () => {
  const render = shelf();
  const tree = render([entry("new"), entry("picked"), entry("old"), entry("fourth")], "creator:picked");
  const all = nodes(tree);
  const lead = all.find((node) => node.props["data-choice-lead"] === true);
  assert.equal(lead.props["data-choice-key"], "creator:picked");
  assert.equal(content(all.find((node) => node.props.id === "choice-heading")), "Choice Playlists");
  assert.equal(all.filter((node) => node.type === "article").length, 4);
  assert.deepEqual(all.filter((node) => node.type === "article").map((node) => node.props["data-choice-key"]), ["creator:picked", "creator:fourth", "creator:new", "creator:old"]);
  assert.deepEqual(all.filter((node) => node.type === "Share").map((node) => node.props.url), ["picked", "fourth", "new", "old"].map(id => `/choice/${id}?kind=creator&lang=en`));
});
test("missing or unplayable feature has no endorsement, fake cards or empty companion", () => {
  const render = shelf();
  const tree = render([entry("hidden", { items: [] }), entry("valid")], "creator:hidden");
  assert.equal(content(nodes(tree).find((node) => node.props.id === "choice-heading")), "Choice Playlists");
  assert.deepEqual(nodes(tree).filter((node) => node.type === "article").map((node) => node.props["data-choice-key"]), ["creator:valid"]);
  assert.ok(!nodes(tree).some((node) => "data-choice-more" in node.props));
});
test("open HUD resolves live entry data and disappears after removal", () => {
  const render = shelf();
  let tree = render([entry("one")]);
  nodes(tree).find((node) => node.type === "button" && node.props.title === "one").props.onClick();
  tree = render([entry("one", { title: "Edited title", intro: "Edited intro" })]);
  const dialog = nodes(tree).find((node) => node.props.role === "dialog");
  assert.ok(content(dialog).includes("Edited title"));
  assert.ok(content(dialog).includes("Edited intro"));
  tree = render([]);
  assert.ok(!nodes(tree).some((node) => node.props.role === "dialog"));
});

test("latest Choice uses publication time within the same calendar week, separate from owner feature", () => {
  const render = shelf();
  const entries = [entry("older", { publishedAt: "2026-09-14T01:00:00Z" }), entry("newer", { publishedAt: "2026-09-16T01:00:00Z" })];
  let tree = render(entries, "creator:older");
  assert.equal(nodes(tree).find(n => n.props["data-choice-lead"] === true).props["data-choice-key"], "creator:older");
  nodes(tree).find(n => n.type === "button" && content(n) === "Latest").props.onClick();
  tree = render(entries, "creator:older");
  assert.equal(nodes(tree).find(n => n.props["data-choice-lead"] === true).props["data-choice-key"], "creator:newer");
});

test("most saved Choice uses real collection Hearts without duplicating the lead", () => {
  const render = shelf();
  const entries = [entry("newer", { weekStart: "2026-10-12" }), entry("popular", { weekStart: "2026-09-14" })];
  const options = { hearts: { "creator:newer": { heartCount: 1 }, "creator:popular": { heartCount: 8 } } };
  let tree = render(entries, null, options);
  nodes(tree).find(n => n.type === "button" && content(n) === "Most saved").props.onClick();
  tree = render(entries, null, options);
  assert.deepEqual(nodes(tree).filter(n => n.type === "article").map(n => n.props["data-choice-key"]), ["creator:popular", "creator:newer"]);
});
