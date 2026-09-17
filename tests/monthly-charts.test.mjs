import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  MonthlyChartError, monthlyChartQuery, publicMonthlyChart,
  readMonthlyChart, finalizeMonthlyCharts,
} from "../src/lib/monthly-charts.ts";

const storageUrl = (bucket, path) => `https://storage.example/${bucket}/${path}`;
const payload = {
  currentMonth: "2026-09", availableMonths: ["2026-09"], month: "2026-09",
  status: "live", minSupporters: 3, finalizedAt: null,
  tracks: [{ id: "song", title: "Title", artist: "Artist", genre: "EDM 百大電音",
    aiTool: "Suno", lyrics: "Lyrics", rank: 1, supporterCount: 3,
    audioPath: "song.mp3", coverPath: "song.png" }],
};

test("monthly chart query validates syntax and canonical genres, not machine time", () => {
  assert.deepEqual(monthlyChartQuery(new URLSearchParams()), { p_month: null, p_genre: null });
  assert.deepEqual(monthlyChartQuery(new URLSearchParams("month=9999-12&genre=all")), { p_month: "9999-12", p_genre: null });
  for (const month of ["", "2026-00", "2026-13", "2026-9", "26-09", "0000-01", "2026-09-01", "2026-09 ", "2026-09' OR true"]) {
    assert.throws(() => monthlyChartQuery(new URLSearchParams({ month })), { status: 400 });
  }
  assert.equal(monthlyChartQuery(new URLSearchParams({ genre: "動感電音" })).p_genre, "EDM 百大電音");
  assert.throws(() => monthlyChartQuery(new URLSearchParams({ genre: "invalid" })), { status: 400 });
});

test("public DTO uses an explicit allowlist and preserves the DB's rank", () => {
  const result = publicMonthlyChart({ ...payload, user_ids: ["private"], tracks: [{
    ...payload.tracks[0], created_by: "author", user_ids: ["listener"],
    rank: 3, audioPath: "https://audio.example/song.mp3", coverPath: null,
  }] }, storageUrl);
  assert.equal(result.tracks[0].rank, 3);
  assert.equal(result.tracks[0].audioUrl, "https://audio.example/song.mp3");
  assert.ok(result.tracks[0].coverUrl.startsWith("/"));
  assert.deepEqual(Object.keys(result.tracks[0]).sort(), ["id", "title", "artist", "genre", "aiTool", "lyrics", "rank", "supporterCount", "audioUrl", "coverUrl"].sort());
  assert.doesNotMatch(JSON.stringify(result), /private|listener|created_by|audioPath|coverPath/);
  for (const audioPath of ["", " ", "javascript:alert(1)", "data:audio/mpeg;base64,abc", "//other.example/song"]) {
    assert.equal(publicMonthlyChart({ ...payload, tracks: [{ ...payload.tracks[0], audioPath }] }, storageUrl).tracks.length, 0);
  }
});

test("one scalar RPC returns every row without a Data API range cap", async () => {
  const tracks = Array.from({ length: 1505 }, (_, index) => ({ ...payload.tracks[0], id: `${index}` }));
  let calls = 0;
  const result = await readMonthlyChart({ rpc: async (name, args) => {
    calls++;
    assert.equal(name, "read_monthly_chart");
    assert.deepEqual(args, { p_month: null, p_genre: null });
    return { data: { ...payload, tracks }, error: null };
  } }, new URLSearchParams(), storageUrl);
  assert.equal(calls, 1);
  assert.equal(result.tracks.length, 1505);
});

test("missing schema never masquerades as an empty historical chart", async () => {
  for (const [error, status] of [
    [{ code: "PGRST202", message: "read_monthly_chart not found" }, 503],
    [{ code: "22023", message: "MONTHLY_CHART_FUTURE_MONTH" }, 400],
    [{ code: "P0002", message: "MONTHLY_CHART_NOT_ENABLED" }, 404],
    [{ message: "secret database details" }, 503],
  ]) {
    await assert.rejects(readMonthlyChart({ rpc: async () => ({ data: null, error }) }, new URLSearchParams(), storageUrl),
      (caught) => caught instanceof MonthlyChartError && caught.status === status && !caught.message.includes("secret"));
  }
  await assert.rejects(readMonthlyChart({ rpc: async () => ({ data: null, error: null }) }, new URLSearchParams(), storageUrl), { status: 503 });
});

test("finalization accepts no caller-selected month or clock", async () => {
  assert.equal(await finalizeMonthlyCharts({ rpc: async (...args) => {
    assert.deepEqual(args, ["finalize_monthly_charts"]);
    return { data: 0, error: null };
  } }), 0);
  await assert.rejects(finalizeMonthlyCharts({ rpc: async () => ({ data: null, error: null }) }), { status: 503 });
});

test("monthly cron rejects missing/mismatched secrets before opening a service client", async () => {
  const source = await readFile(new URL("../src/app/api/cron/monthly-charts/route.ts", import.meta.url), "utf8");
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /!secret \|\| provided\.length !== expected\.length \|\| !timingSafeEqual/);
  assert.ok(source.indexOf("status: 401") < source.indexOf("finalizeMonthlyCharts(monthlyChartAdmin())"));
  assert.doesNotMatch(source, /searchParams|request\.json/);
});
