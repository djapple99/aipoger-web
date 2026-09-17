import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/public-choice-gallery.tsx", import.meta.url), "utf8");
const shelfSource = readFileSync(new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url), "utf8");
const transpile = (value) => ts.transpileModule(value, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function loadModel(path) {
  const loaded = { exports: {} };
  new Function("exports", "module", transpile(readFileSync(new URL(path, import.meta.url), "utf8")))(loaded.exports, loaded);
  return loaded.exports;
}

const choiceModel = loadModel("../src/lib/aipoger-choice.ts");
const creatorModel = loadModel("../src/lib/creator-choice.ts");
const copyModel = loadModel("../src/lib/choice-copy.ts");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const response = (payload, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => payload });
const item = (id, extra = {}) => ({
  id, itemId: `item-${id}`, sourceKind: "listen_bar_track", title: `Song ${id}`,
  artist: "Artist", genre: "Pop", audioUrl: `/full-${id}.mp3`, coverUrl: `/song-${id}.png`,
  position: 0, ...extra,
});
const collection = (id, extra = {}) => ({
  id, curatorName: "Curator", title: `Issue ${id}`, intro: "Recommendation", weekStart: "2026-09-14",
  avatarUrl: "/avatar.png", items: [item(id)], ...extra,
});

function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}

// Exercise the actual component functions with deterministic hook lifecycles and transport.
// Child components stay at their public prop boundary; their UI contracts are checked below.
function mount(t, options = {}) {
  let cursor = 0;
  let dirty = true;
  let mounted = true;
  let tree;
  let lang = options.lang ?? "en";
  let authCallback;
  let unsubscribed = 0;
  let token = options.token === undefined ? "token-a" : options.token;
  const states = [];
  const refs = [];
  const effects = [];
  let pendingEffects = [];
  const calls = [];
  const starts = [];
  const official = options.official ?? [collection("official")];
  const creators = options.creators ?? [collection("creator")];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value) => {
        if (!mounted) return;
        const next = typeof value === "function" ? value(states[index]) : value;
        if (!Object.is(next, states[index])) { states[index] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      return refs[index] ??= { current: initial };
    },
    useEffect(fn, dependencies) {
      const index = cursor++;
      const previous = effects[index];
      if (!previous || dependencies.some((value, key) => !Object.is(value, previous.dependencies[key]))) {
        pendingEffects.push(() => {
          previous?.cleanup?.();
          effects[index] = { dependencies, cleanup: fn() };
        });
      }
    },
  };
  const fallbackFetch = async (url, init) => {
    if (url === "/api/choice/current") return response({ collections: official });
    if (url === "/api/creator-choice/public") return response({ collections: creators });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      return url === "/api/choice/interactions"
        ? response({ interaction: { recordKey: `${body.collectionKind}:${body.collectionId}`, heartCount: body.action === "heart" ? 8 : 6, myHeart: body.action === "heart" } })
        : response({ record: { recordKey: body.recordKey, favoriteCount: 23, myFavorited: true } });
    }
    const keys = new URL(url, "http://localhost").searchParams.get("keys").split(",");
    return url.startsWith("/api/choice/interactions")
      ? response({ interactions: keys.map((recordKey) => ({ recordKey, heartCount: 7, myHeart: false })) })
      : response({ records: keys.map((recordKey) => ({ recordKey, favoriteCount: 22, myFavorited: false })) });
  };
  const fetch = async (url, init) => {
    calls.push({ url, ...init });
    return options.fetch ? options.fetch(url, init, fallbackFetch) : fallbackFetch(url, init);
  };
  const loaded = { exports: {} };
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "lucide-react": { RotateCw: "RotateCw" },
    "@/components/showtime-choice-shelf": { __esModule: true, default: "Shelf" },
    "@/components/showtime-queue-player": { __esModule: true, default: "Player" },
    "@/lib/aipoger-choice": choiceModel,
    "@/lib/creator-choice": creatorModel,
    "@/lib/choice-copy": copyModel,
    "@/lib/brand": { AIPOGER_BRAND_LOGO: "/brand.png" },
    "@/lib/supabase": { supabase: { auth: {
      getSession: () => options.session ?? Promise.resolve({ data: { session: token ? { access_token: token } : null }, error: null }),
      onAuthStateChange: (callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: () => { unsubscribed++; } } } };
      },
    } } },
  };
  new Function("require", "module", "exports", "fetch", transpile(source))((id) => {
    assert.ok(id in modules, `unexpected dependency: ${id}`);
    return modules[id];
  }, loaded, loaded.exports, fetch);
  const render = () => {
    cursor = 0;
    dirty = false;
    pendingEffects = [];
    tree = loaded.exports.default({ lang });
    nodes(tree).find((node) => node.type === "Player").props.ref.current = {
      start: async (...args) => { starts.push(args); return options.start ? options.start(...args) : true; },
    };
    pendingEffects.forEach((run) => run());
  };
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    effects.forEach((effect) => effect?.cleanup?.());
  };
  t.after(unmount);
  render();
  return {
    calls, starts,
    shelf: () => nodes(tree).find((node) => node.type === "Shelf").props,
    retry: () => nodes(tree).find((node) => node.type === "button").props.onClick(),
    hasRetry: () => nodes(tree).some((node) => node.type === "button"),
    auth(nextToken) { token = nextToken; authCallback("SIGNED_IN", token ? { access_token: token } : null); },
    language(value) { lang = value; dirty = true; },
    async flush() {
      for (let round = 0; round < 12; round++) {
        await tick();
        if (dirty && mounted) render();
      }
    },
    unmount,
    unsubscribed: () => unsubscribed,
  };
}

test("gallery preserves official/personal/creator cover identity, titles, order and localized links", async (t) => {
  const gallery = mount(t, {
    lang: "ja",
    official: [collection("brand", { curatorIdentity: "official", avatarUrl: "/not-brand.png" }), collection("personal", { curatorIdentity: "personal" }), collection("cover", { coverUrl: "/custom.png" })],
    creators: [collection("creator"), collection("creator-cover", { coverUrl: "/creator-cover.png" })],
  });
  assert.equal(gallery.shelf().loading, true);
  await gallery.flush();
  const entries = gallery.shelf().entries;
  assert.deepEqual(entries.map((entry) => entry.coverUrl), ["/brand.png", "/avatar.png", "/custom.png", "/avatar.png", "/creator-cover.png"]);
  assert.deepEqual(entries.map((entry) => entry.title), ["Issue brand", "Issue personal", "Issue cover", "Issue creator", "Issue creator-cover"]);
  assert.equal(entries[0].href, "/choice/brand?kind=official&lang=ja");
  assert.equal(entries[3].href, "/choice/creator?kind=creator&lang=ja");
  assert.equal(gallery.shelf().hearts["official:brand"].heartCount, 7);
  assert.equal(gallery.shelf().itemHearts["bar:brand"].heartCount, 22);
  assert.equal(gallery.shelf().loading, false);
  assert.ok(gallery.calls.every(({ url }) => /^\/api\/(choice\/(current|interactions)|creator-choice\/public|honor-board\/interactions)/.test(url)));
});

test("collection and song queries deduplicate keys and honor the 48/80 lookup limits", async (t) => {
  const official = Array.from({ length: 49 }, (_, i) => collection(`o${i}`, {
    items: [item(`s${i * 2}`), item(`s${i * 2 + 1}`), item("shared")],
  }));
  const gallery = mount(t, { official, creators: [] });
  await gallery.flush();
  const keysFor = (prefix) => gallery.calls.filter(({ url }) => url.startsWith(prefix)).map(({ url }) => new URL(url, "http://localhost").searchParams.get("keys").split(","));
  const choiceBatches = keysFor("/api/choice/interactions?");
  const songBatches = keysFor("/api/honor-board/interactions?");
  assert.deepEqual(choiceBatches.map((keys) => keys.length), [48, 1]);
  assert.deepEqual(songBatches.map((keys) => keys.length), [80, 19]);
  assert.equal(songBatches.flat().filter((key) => key === "bar:shared").length, 1);
  assert.equal(Object.keys(gallery.shelf().itemHearts).length, 99);
});

test("collection save/remove and HUD song favorites remain independent", async (t) => {
  const gallery = mount(t);
  await gallery.flush();
  const entry = gallery.shelf().entries[0];
  gallery.shelf().onToggleHeart(entry);
  gallery.shelf().onToggleHeart(entry);
  await gallery.flush();
  assert.equal(gallery.calls.filter((call) => call.method === "POST").length, 1, "rapid duplicate clicks are locked synchronously");
  assert.equal(gallery.shelf().hearts["official:official"].myHeart, true);
  assert.equal(gallery.shelf().itemHearts["bar:official"].heartCount, 22);
  gallery.shelf().onToggleHeart(entry);
  await gallery.flush();
  assert.equal(JSON.parse(gallery.calls.at(-1).body).action, "remove_heart");
  gallery.shelf().onToggleItemHeart(entry.items[0]);
  await gallery.flush();
  assert.deepEqual(JSON.parse(gallery.calls.at(-1).body), {
    action: "favorite", recordKey: "bar:official", targetKind: "bar", targetId: "official",
    targetTitle: "Artist / Song official", targetArtist: "Artist", targetGenre: "Pop",
  });
  assert.equal(gallery.shelf().hearts["official:official"].myHeart, false);
  assert.equal(gallery.shelf().itemHearts["bar:official"].myHeart, true);
});

test("full ordered playback uses the global queue adapter and selected item position", async (t) => {
  const gallery = mount(t, { official: [collection("mix", { items: [item("silent", { audioUrl: null }), item("first"), item("battle", { sourceKind: "battle_archive" })] })], creators: [] });
  await gallery.flush();
  const entry = gallery.shelf().entries[0];
  gallery.shelf().onPlay(entry, "item-battle");
  await gallery.flush();
  assert.equal(gallery.starts[0][1], 1);
  assert.equal(gallery.starts[0][2], "Curator Choice");
  assert.deepEqual(gallery.starts[0][0].map((track) => track.audioUrl), ["/full-first.mp3", "/full-battle.mp3"]);
  gallery.shelf().onPlay(entry);
  gallery.shelf().onPlay(entry, "item-silent");
  await gallery.flush();
  assert.equal(gallery.starts.length, 2, "unplayable selection must not start a different song");
  assert.equal(gallery.starts[1][1], 0);
  gallery.shelf().onToggleItemHeart(entry.items[2]);
  await gallery.flush();
  assert.equal(JSON.parse(gallery.calls.at(-1).body).recordKey, "battle:battle");
});

test("failed catalog keeps the successful source visible and retry recovers", async (t) => {
  let failed = true;
  const gallery = mount(t, { fetch: (url, init, fallback) => url === "/api/choice/current" && failed ? response({}, false) : fallback(url, init) });
  await gallery.flush();
  assert.deepEqual(gallery.shelf().entries.map((entry) => entry.kind), ["creator"]);
  assert.equal(gallery.shelf().loading, false);
  assert.equal(gallery.hasRetry(), true);
  failed = false;
  gallery.retry();
  await gallery.flush();
  assert.equal(gallery.shelf().entries.length, 2);
  assert.equal(gallery.hasRetry(), false);
});

test("empty catalogs do not fetch unscoped interaction records", async (t) => {
  const gallery = mount(t, { official: [], creators: [] });
  await gallery.flush();
  assert.equal(gallery.shelf().entries.length, 0);
  assert.equal(gallery.hasRetry(), false);
  assert.equal(gallery.calls.length, 2);
});

test("GET errors release loading flags and prevent writes based on unknown saved state", async (t) => {
  let failed = true;
  const gallery = mount(t, { fetch: (url, init, fallback) => url.startsWith("/api/choice/interactions?") && failed ? Promise.reject(new Error("offline")) : fallback(url, init) });
  await gallery.flush();
  assert.deepEqual(gallery.shelf().heartBusy, {});
  assert.equal(gallery.hasRetry(), true);
  gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.equal(gallery.calls.some((call) => call.method === "POST"), false);
  failed = false;
  gallery.retry();
  await gallery.flush();
  assert.equal(gallery.hasRetry(), false);
  gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.equal(gallery.shelf().hearts["official:official"].myHeart, true);
});

test("network, malformed JSON and invalid mutation responses never leave either save busy", async (t) => {
  let failure = "network";
  const gallery = mount(t, { fetch: (url, init, fallback) => {
    if (init.method !== "POST" || !failure) return fallback(url, init);
    if (failure === "network") return Promise.reject(new Error("offline"));
    if (failure === "json") return { ok: true, json: async () => { throw new SyntaxError("bad JSON"); } };
    return response({});
  } });
  await gallery.flush();
  for (const kind of ["network", "json", "payload"]) {
    failure = kind;
    gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
    gallery.shelf().onToggleItemHeart(gallery.shelf().entries[0].items[0]);
    await gallery.flush();
    assert.equal(gallery.shelf().heartBusy["official:official"], false);
    assert.equal(gallery.shelf().itemHeartBusy["bar:official"], false);
    assert.ok(gallery.shelf().heartError);
  }
  failure = "";
  gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.equal(gallery.shelf().heartError, "");
  assert.equal(gallery.shelf().hearts["official:official"].myHeart, true);
});

test("auth changes invalidate pending writes immediately and ignore late old-session responses", async (t) => {
  const pending = deferred();
  const gallery = mount(t, { fetch: (url, init, fallback) => init.method === "POST" ? pending.promise : fallback(url, init) });
  await gallery.flush();
  const entry = gallery.shelf().entries[0];
  gallery.shelf().onToggleHeart(entry);
  await gallery.flush();
  const write = gallery.calls.at(-1);
  gallery.auth("token-b");
  assert.equal(write.signal.aborted, true);
  gallery.shelf().onToggleHeart(entry);
  await gallery.flush();
  assert.equal(gallery.calls.filter((call) => call.method === "POST").length, 1);
  assert.ok(gallery.calls.some((call) => call.headers?.Authorization === "Bearer token-b"));
  pending.resolve(response({ interaction: { recordKey: "official:official", heartCount: 100, myHeart: true } }));
  await gallery.flush();
  assert.equal(gallery.shelf().hearts["official:official"].myHeart, false);
  assert.equal(gallery.shelf().hearts["official:official"].heartCount, 7);
  assert.deepEqual(gallery.shelf().heartBusy, {});
  gallery.auth(null);
  await gallery.flush();
  gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.match(gallery.shelf().heartError, /Sign in/);
  assert.equal(gallery.calls.filter((call) => call.method === "POST").length, 1);
});

test("a late initial getSession cannot overwrite a newer auth event", async (t) => {
  const session = deferred();
  const gallery = mount(t, { session: session.promise });
  gallery.auth("new-session");
  await gallery.flush();
  session.resolve({ data: { session: { access_token: "stale-session" } }, error: null });
  await gallery.flush();
  assert.equal(gallery.calls.some((call) => call.headers?.Authorization === "Bearer stale-session"), false);
  gallery.shelf().onToggleHeart(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.equal(gallery.calls.at(-1).headers.Authorization, "Bearer new-session");
});

test("language change ignores obsolete catalog responses, and unmount cancels active requests", async (t) => {
  const oldCatalog = deferred();
  let first = true;
  const gallery = mount(t, { fetch: (url, init, fallback) => {
    if (url === "/api/choice/current" && first) { first = false; return oldCatalog.promise; }
    return fallback(url, init);
  } });
  await gallery.flush();
  gallery.language("ko");
  await gallery.flush();
  oldCatalog.resolve(response({ collections: [collection("obsolete")] }));
  await gallery.flush();
  assert.equal(gallery.shelf().entries[0].id, "official");
  assert.match(gallery.shelf().entries[0].href, /lang=ko$/);
  gallery.unmount();
  assert.ok(gallery.calls.every((call) => call.signal.aborted));
  assert.equal(gallery.unsubscribed(), 1);
});

test("playback rejection is surfaced without an unhandled promise", async (t) => {
  const gallery = mount(t, { start: () => Promise.reject(new Error("blocked audio")) });
  await gallery.flush();
  gallery.shelf().onPlay(gallery.shelf().entries[0]);
  await gallery.flush();
  assert.match(gallery.shelf().heartError, /Playback failed/);
});

test("reusable shelf keeps HUD, comments, share and independent saves without duplicate CTA", () => {
  assert.doesNotMatch(shelfSource, /\/profile\/choice/);
  assert.match(shelfSource, /<ChoiceCommentsDialog/);
  assert.match(shelfSource, /<ShareButton/);
  assert.match(shelfSource, /createPortal/);
  assert.match(shelfSource, /onToggleItemHeart\(item\)/);
  assert.match(shelfSource, /aria-pressed=\{heart\.myHeart\}/);
  assert.match(shelfSource, /aria-pressed=\{itemHeart\.myHeart\}/);
  assert.match(source, /export type PublicChoiceGalleryProps = \{ lang: Lang; chart\?: ReactNode \}/);
  assert.doesNotMatch(source, /\/api\/(?:ai-music|listen-bar|showtime|monthly)|\.from\(|<audio|sort\(/);
});
