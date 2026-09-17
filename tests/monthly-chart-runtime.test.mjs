import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/monthly-chart.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const session = (user = "a", token = `token-${user}`) => user ? { user: { id: user }, access_token: token } : null;
const sessionResult = (value) => ({ data: { session: value }, error: null });
const response = (payload) => ({ ok: true, json: async () => payload });
const song = (id, rank, extra = {}) => ({
  id, rank, title: `Song ${id}`, artist: "Artist", genre: "EDM 百大電音", aiTool: "Tool",
  supporterCount: rank === null ? 2 : 8 - rank, audioUrl: `/audio-${id}.mp3`, coverUrl: `/cover-${id}.png`, lyrics: "Lyrics", ...extra,
});
const finalChart = () => ({
  month: "2026-09", currentMonth: "2026-10", availableMonths: ["2026-10", "2026-09"],
  status: "final", minSupporters: 3, finalizedAt: "2026-09-30T16:00:00Z",
  tracks: [song("first", 1), song("second", 2), song("building", null)],
});
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object") return text(node.props?.children);
  return node == null || typeof node === "boolean" ? "" : String(node);
}

// Same deterministic hook lifecycle/JSX prop-boundary pattern as public-choice-gallery.
// Only transport, auth, browser time/events and the shared player are mocked.
function mount(t, options = {}) {
  let cursor = 0, dirty = true, mounted = true, tree, authCallback;
  let pendingEffects = [];
  let authSession = session();
  let now = Date.parse("2026-10-01T15:59:30Z");
  const states = [], refs = [], effects = [], memos = [];
  const sessions = options.initialSession ? [options.initialSession] : [];
  const calls = [], reads = [], starts = [], heartEvents = [];
  const intervals = new Map();
  let intervalId = 0, toggles = 0, unsubscribed = 0;
  const chart = options.chart ?? finalChart();
  const player = options.player ?? { playing: false, session: null };
  const unchanged = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
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
    useRef(initial) { return refs[cursor++] ??= { current: initial }; },
    useEffect(fn, dependencies) {
      const index = cursor++, previous = effects[index];
      if (!previous || !unchanged(dependencies, previous.dependencies)) pendingEffects.push(() => {
        previous?.cleanup?.();
        effects[index] = { dependencies, cleanup: fn() };
      });
    },
    useMemo(fn, dependencies) {
      const index = cursor++, previous = memos[index];
      if (!previous || !unchanged(dependencies, previous.dependencies)) memos[index] = { dependencies, value: fn() };
      return memos[index].value;
    },
    useCallback(fn, dependencies) { return react.useMemo(() => fn, dependencies); },
  };
  const window = new EventTarget();
  window.setInterval = (callback, delay) => { const id = ++intervalId; intervals.set(id, { callback, delay }); return id; };
  window.clearInterval = (id) => intervals.delete(id);
  window.addEventListener("aipoger:music-heart", (event) => heartEvents.push(event.detail));
  const document = new EventTarget();
  document.visibilityState = "visible";
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  class CustomEvent extends Event {
    constructor(type, options) { super(type); this.detail = options.detail; }
  }
  const supabase = {
    auth: {
      getSession: () => sessions.length ? sessions.shift() : Promise.resolve(sessionResult(authSession)),
      onAuthStateChange: (callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: () => { unsubscribed++; } } } };
      },
    },
    from(table) {
      assert.equal(table, "listen_bar_track_reactions");
      const filters = {};
      const query = {
        select(columns) { assert.equal(columns, "track_id"); return query; },
        eq(key, value) { filters[key] = value; return query; },
        in(key, ids) {
          assert.equal(key, "track_id");
          const read = { ...filters, ids: [...ids] };
          reads.push(read);
          return options.readHearts ? options.readHearts(read) : Promise.resolve({ data: [], error: null });
        },
      };
      return query;
    },
  };
  const fetch = async (url, init = {}) => {
    const call = { url, ...init };
    calls.push(call);
    if (url.startsWith("/api/charts/monthly?")) return response(structuredClone(chart));
    assert.equal(url, "/api/listen-bar/reaction");
    assert.equal(init.method, "POST");
    return options.write ? options.write(call) : response({ heartedToday: true });
  };
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: "Fragment" },
    "next/link": { __esModule: true, default: "Link" },
    "lucide-react": Object.fromEntries(["Heart", "Info", "Pause", "Play", "RefreshCw", "Search", "X"].map((name) => [name, name])),
    "@/components/share-button": { __esModule: true, default: "ShareButton" },
    "@/lib/brand": { AIPOGER_BRAND_LOGO: "/brand.png" },
    "@/lib/i18n": { useI18n: () => ({ t: (key) => key }) },
    "@/lib/music-genres": { MUSIC_GENRE_OPTIONS: [{ value: "EDM 百大電音", labelKey: "genre_edm" }] },
    "@/lib/music-player-store": {
      useMusicPlayer: () => player,
      musicPlayer: { toggle: () => { toggles++; }, start: async (...args) => { starts.push(args); } },
    },
    "@/lib/supabase": { supabase },
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "fetch", "window", "document", "Date", "CustomEvent", compiled)((id) => {
    assert.ok(Object.hasOwn(modules, id), `Unexpected dependency: ${id}`);
    return modules[id];
  }, loaded, loaded.exports, fetch, window, document, ClockDate, CustomEvent);
  function render() {
    cursor = 0; dirty = false; pendingEffects = [];
    tree = loaded.exports.default({ lang: "en" });
    pendingEffects.forEach((run) => run());
  }
  function unmount() {
    if (!mounted) return;
    mounted = false;
    effects.forEach((effect) => effect?.cleanup?.());
  }
  function button(predicate) {
    const match = nodes(tree).find((node) => node.type === "button" && predicate(node.props));
    assert.ok(match, "Expected rendered button");
    return match.props;
  }
  t.after(unmount);
  render();
  return {
    calls, reads, starts, heartEvents,
    posts: () => calls.filter((call) => call.method === "POST"),
    chartReads: () => calls.filter((call) => call.url.startsWith("/api/charts/monthly?")),
    heart: (id = "first") => button((props) => "aria-pressed" in props && props["aria-label"].endsWith(`: Song ${id}`)),
    cover: (id = "first") => button((props) => /^(Play|Pause) Song /.test(props["aria-label"] ?? "") && props["aria-label"].endsWith(`Song ${id}`)),
    playAll: () => button((props) => text(props.children) === "Play chart"),
    search(value) { nodes(tree).find((node) => node.type === "input").props.onChange({ target: { value } }); },
    auth(user, event = "SIGNED_IN", token) { authSession = session(user, token); authCallback(event, authSession); },
    queueSession(promise) { sessions.push(promise); },
    time(value) { now = Date.parse(value); },
    timer() { for (const { callback, delay } of [...intervals.values()]) { assert.equal(delay, 60_000); callback(); } },
    visibility(value) { document.visibilityState = value; document.dispatchEvent(new Event("visibilitychange")); },
    toggles: () => toggles,
    text: () => text(tree),
    async flush() { for (let round = 0; round < 12; round++) { await tick(); if (dirty && mounted) render(); } },
    unmount,
    intervals: () => intervals.size,
    unsubscribed: () => unsubscribed,
  };
}

test("account change while getSession is pending never sends a stale Heart POST", async (t) => {
  const pending = deferred(), chart = mount(t);
  await chart.flush();
  chart.queueSession(pending.promise);
  chart.heart().onClick();
  chart.auth("b");
  await chart.flush();
  pending.resolve(sessionResult(session("a")));
  await chart.flush();
  assert.equal(chart.posts().length, 0);
  assert.equal(chart.heartEvents.length, 0);
  assert.equal(chart.heart()["aria-pressed"], false);
  chart.heart().onClick();
  await chart.flush();
  assert.equal(chart.posts()[0].headers.Authorization, "Bearer token-b");
  assert.equal(chart.heart()["aria-pressed"], true);
});

test("late initial session and pending Heart reads cannot restore an old account", async (t) => {
  const initial = deferred(), oldRead = deferred();
  const chart = mount(t, { initialSession: initial.promise, readHearts: (read) => read.user_id === "a" ? oldRead.promise : { data: [], error: null } });
  chart.auth("a");
  await chart.flush();
  assert.ok(chart.reads.some((read) => read.user_id === "a"));
  chart.auth("b");
  await chart.flush();
  initial.resolve(sessionResult(session("a")));
  oldRead.resolve({ data: [{ track_id: "first" }], error: null });
  await chart.flush();
  assert.equal(chart.heart()["aria-pressed"], false);
  chart.heart().onClick();
  await chart.flush();
  assert.equal(chart.posts()[0].headers.Authorization, "Bearer token-b");
});

for (const phase of ["response", "json"]) {
  test(`account switch during Heart ${phase} ignores old response without releasing the new user's lock`, async (t) => {
    const old = deferred(), current = deferred();
    const chart = mount(t, { write: (call) => call.headers.Authorization === "Bearer token-a"
      ? phase === "response" ? old.promise : { ok: true, json: () => old.promise }
      : current.promise });
    await chart.flush();
    chart.heart().onClick();
    await chart.flush();
    chart.auth("b");
    await chart.flush();
    chart.heart().onClick();
    await chart.flush();
    assert.equal(chart.posts().length, 2);
    old.resolve(phase === "response" ? response({ heartedToday: true }) : { heartedToday: true });
    await chart.flush();
    assert.equal(chart.heartEvents.length, 0);
    assert.equal(chart.heart()["aria-pressed"], false);
    assert.equal(chart.heart().disabled, true);
    chart.heart().onClick();
    await chart.flush();
    assert.equal(chart.posts().length, 2, "old finally must not clear the new account's in-flight lock");
    current.resolve(response({ heartedToday: true }));
    await chart.flush();
    assert.equal(chart.heartEvents.length, 1);
    assert.equal(chart.heart()["aria-pressed"], true);
    assert.equal(chart.heart().disabled, false);
  });
}

test("sign-out suppresses a stale mutation error and requires auth for the next Heart", async (t) => {
  const pending = deferred(), chart = mount(t, { write: () => pending.promise });
  await chart.flush();
  chart.heart().onClick();
  await chart.flush();
  chart.auth(null, "SIGNED_OUT");
  pending.reject(new Error("old request failed"));
  await chart.flush();
  assert.doesNotMatch(chart.text(), /Could not update your heart/);
  assert.equal(chart.heart()["aria-pressed"], false);
  chart.heart().onClick();
  await chart.flush();
  assert.match(chart.text(), /Sign in to support and save/);
  assert.equal(chart.posts().length, 1);
  assert.equal(chart.heartEvents.length, 0);
});

test("unmount ignores a pending Heart response and cleans up auth, timers and visibility", async (t) => {
  const pending = deferred(), chart = mount(t, { write: () => pending.promise });
  await chart.flush();
  chart.heart().onClick();
  await chart.flush();
  const reads = chart.reads.length;
  chart.unmount();
  pending.resolve(response({ heartedToday: true }));
  chart.visibility("visible");
  chart.timer();
  await chart.flush();
  assert.equal(chart.heartEvents.length, 0);
  assert.equal(chart.reads.length, reads);
  assert.equal(chart.intervals(), 0);
  assert.equal(chart.unsubscribed(), 1);
});

test("same-user TOKEN_REFRESHED retains Hearts until independent reload finishes on a final chart", async (t) => {
  const refresh = deferred();
  let refreshing = false;
  const chart = mount(t, { readHearts: () => refreshing ? refresh.promise : { data: [{ track_id: "first" }], error: null } });
  await chart.flush();
  assert.equal(chart.heart()["aria-pressed"], true);
  const reads = chart.reads.length, chartReads = chart.chartReads().length;
  refreshing = true;
  chart.auth("a", "TOKEN_REFRESHED", "refreshed-token-a");
  await chart.flush();
  assert.ok(chart.reads.length > reads, "same user identity must still reload daily Hearts");
  assert.equal(chart.heart()["aria-pressed"], true, "token refresh must not blank known state");
  refresh.resolve({ data: [], error: null });
  await chart.flush();
  assert.equal(chart.heart()["aria-pressed"], false);
  assert.equal(chart.chartReads().length, chartReads, "Heart sync must not refetch frozen standings");
});

for (const trigger of ["timer", "visibility"]) {
  test(`final-chart daily Hearts roll over at Taiwan midnight via ${trigger} without refreshing ranks`, async (t) => {
    const chart = mount(t, { readHearts: (read) => ({
      data: read.vote_date === "2026-10-01" ? [{ track_id: "first" }] : [], error: null,
    }) });
    await chart.flush();
    assert.equal(chart.heart()["aria-pressed"], true);
    assert.equal(chart.reads.at(-1).vote_date, "2026-10-01");
    const chartReads = chart.chartReads().length;
    if (trigger === "visibility") chart.visibility("hidden");
    chart.time("2026-10-01T16:00:01Z");
    if (trigger === "visibility") {
      const reads = chart.reads.length;
      chart.timer();
      await chart.flush();
      assert.equal(chart.reads.length, reads, "hidden tabs do not poll Hearts");
      chart.visibility("visible");
    } else chart.timer();
    await chart.flush();
    assert.equal(chart.reads.at(-1).vote_date, "2026-10-02");
    assert.equal(chart.heart()["aria-pressed"], false);
    assert.equal(chart.chartReads().length, chartReads);
    assert.match(chart.text(), /Final chart/);
  });
}

for (const playing of [true, false]) {
  test(`Play chart replaces a foreign queue when its first track is already ${playing ? "playing" : "paused"}`, async (t) => {
    const chart = mount(t, { player: { playing, session: { index: 0, queue: [{ id: "bar:first" }, { id: "bar:unrelated" }] } } });
    await chart.flush();
    assert.equal(Boolean(chart.playAll().disabled), false);
    chart.playAll().onClick();
    await chart.flush();
    assert.equal(chart.toggles(), 0);
    assert.equal(chart.starts.length, 1);
    const [queue, index, title, options] = chart.starts[0];
    assert.deepEqual(queue.map((track) => track.id), ["bar:first", "bar:second"]);
    assert.deepEqual(queue.map((track) => track.heartTrackId), ["first", "second"]);
    assert.equal(index, 0);
    assert.equal(title, "Showtime 2026-09");
    assert.deepEqual(options, { repeat: false });
  });
}

test("row play still toggles the current song, while Play chart uses the displayed filtered order", async (t) => {
  const chart = mount(t, { player: { playing: true, session: { index: 0, queue: [{ id: "bar:first" }] } } });
  await chart.flush();
  chart.cover().onClick();
  assert.equal(chart.toggles(), 1);
  assert.equal(chart.starts.length, 0);
  chart.search("second");
  await chart.flush();
  chart.playAll().onClick();
  await chart.flush();
  assert.deepEqual(chart.starts[0][0].map((track) => track.id), ["bar:second"]);
  assert.equal(chart.starts[0][1], 0);
  chart.search("building");
  await chart.flush();
  assert.equal(chart.playAll().disabled, true, "an unranked search result is not a ranked playlist");
});
