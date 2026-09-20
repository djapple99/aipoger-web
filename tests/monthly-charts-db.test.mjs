// Run with MONTHLY_CHART_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js
// node --test --experimental-strip-types tests/monthly-charts*.test.mjs
// The optional test engine is installed outside the shared worktree; production
// schema is never used. Every test executes the actual migration SQL.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { canonicalMusicGenre, MUSIC_GENRE_VALUES } from "../src/lib/music-genres.ts";

const modulePath = process.env.MONTHLY_CHART_PGLITE_MODULE;
const migration = await readFile(new URL("../supabase/migrations/20260917151525_monthly_charts.sql", import.meta.url), "utf8");
const genreMigration = await readFile(new URL("../supabase/migrations/20260917153446_monthly_chart_canonical_genres.sql", import.meta.url), "utf8");
const addedGenresMigration = await readFile(new URL("../supabase/migrations/20260920120000_three_music_genres.sql", import.meta.url), "utf8");
const dbTest = (name, fn) => test(name, { skip: !modulePath && "Set MONTHLY_CHART_PGLITE_MODULE to run isolated PostgreSQL tests" }, fn);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function fixture(t, { canonicalGenres = true } = {}) {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.listen_bar_tracks (
      id uuid primary key, title text, artist text, genre text, ai_tool text,
      lyrics text, audio_path text, cover_path text, source text default 'community',
      is_active boolean default true, review_status text default 'approved',
      hidden_at timestamptz, removed_at timestamptz, ai_music_showtime_public_removed_at timestamptz,
      ai_music_showtime_certified boolean default false, created_by uuid,
      created_at timestamptz default '2026-09-01T00:00:00+08:00'
    );
    create table public.listen_bar_track_reactions (
      track_id uuid references public.listen_bar_tracks(id) on delete cascade,
      user_id uuid, vote_date date, reaction text, created_at timestamptz default now(),
      primary key(track_id,user_id,vote_date)
    );
  `);
  // Freeze only the DB clock in this disposable database, including launch time.
  const fixedMigration = migration.replace("select date_trunc('month', clock_timestamp() at time zone 'Asia/Taipei')::date;", "select date '2026-09-01';");
  await db.exec(fixedMigration);
  if (canonicalGenres) { await db.exec(genreMigration); await db.exec(addedGenresMigration); }
  const month = async (value) => db.exec(`create or replace function public.monthly_chart_current_month()
    returns date language sql volatile set search_path = '' as $$ select date '${value}-01'; $$;`);
  const track = async (n, genre = "EDM 百大電音") => db.query(`insert into public.listen_bar_tracks
    (id,title,artist,genre,ai_tool,lyrics,audio_path,cover_path,created_by)
    values ($1,$2,'Artist',$3,'Suno','Lyrics','song.mp3','cover.png',$4)`, [id(n), `Song ${n}`, genre, id(9000 + n)]);
  const heart = async (n, user, date = "2026-09-02", reaction = "heart") => db.query(`insert into public.listen_bar_track_reactions
    (track_id,user_id,vote_date,reaction) values ($1,$2,$3,$4)`, [id(n), id(user), date, reaction]);
  const read = async (value = null, genre = null) => (await db.query(`select public.read_monthly_chart($1,$2) as chart`, [value, genre])).rows[0].chart;
  return { db, month, track, heart, read, fixedMigration };
}

test("migration has private scalar RPCs, locking, immutable headers and no legacy inputs", () => {
  assert.match(migration, /returns jsonb language plpgsql security definer set search_path = ''/);
  assert.match(migration, /pg_advisory_xact_lock\(724193, 1\)/);
  assert.match(migration, /count\(distinct r\.user_id\)/);
  assert.match(migration, /r\.user_id is distinct from t\.created_by/);
  assert.doesNotMatch(migration, /dense_rank\(|favoriteUserIds|battle_result_archives|aipoger_choice_collection_hearts|limit 1000/i);
  assert.match(migration, /for each statement execute function public\.monthly_chart_before_source_write/);
  assert.match(migration, /revoke all on function public\.read_monthly_chart\(text, text\) from public, anon, authenticated/);
});

dbTest("DB month launch, syntax/future validation, no fake legacy months and migration replay", async (t) => {
  const { db, read, fixedMigration } = await fixture(t);
  let result = await read();
  assert.deepEqual(result.availableMonths, ["2026-09"]);
  assert.equal(result.status, "live");
  assert.deepEqual(result.tracks, []);
  for (const value of ["2026-13", "2026-00", "2026-9", "2026-09-01", "", "0000-01", "2026-10", "9999-12"]) {
    await assert.rejects(read(value), (error) => error.code === "22023");
  }
  await assert.rejects(read("2026-08"), /MONTHLY_CHART_NOT_ENABLED/);
  await db.exec(fixedMigration);
  await db.exec(genreMigration);
  result = await read();
  assert.deepEqual(result.availableMonths, ["2026-09"]);
});

dbTest("DB deduplicates effective Hearts, excludes author/other reactions, minimum3, ties and genre ranks", async (t) => {
  const { db, track, heart, read } = await fixture(t);
  for (let n = 1; n <= 6; n++) await track(n, n === 3 ? "Band Rock 熱血搖滾" : "EDM 百大電音");
  for (const [n, count] of [[1, 4], [2, 4], [3, 3], [4, 2], [5, 1]]) {
    for (let user = 1; user <= count; user++) await heart(n, user);
  }
  await heart(1, 1, "2026-09-03");
  await heart(1, 9001);
  await heart(4, 9004);
  await heart(4, 3, "2026-09-02", "star");
  await db.query("update public.listen_bar_tracks set ai_music_showtime_certified=true where id=$1", [id(2)]);
  const all = await read();
  assert.deepEqual(all.tracks.map((row) => [row.id, row.supporterCount, row.rank]), [
    [id(1), 4, 1], [id(2), 4, 1], [id(3), 3, 3], [id(4), 2, null], [id(5), 1, null],
  ]);
  assert.equal((await read(null, "Band Rock 熱血搖滾")).tracks[0].rank, 1);
  assert.doesNotMatch(JSON.stringify(all), /user_id|created_by|9001/);
  // Cancelling the last effective Heart removes this user's monthly support.
  await db.query("delete from public.listen_bar_track_reactions where track_id=$1 and user_id=$2", [id(5), id(1)]);
  assert.equal((await read()).tracks.some((row) => row.id === id(5)), false);
});

dbTest("Taiwan [start,end) boundaries are evaluated using the persisted Taiwan day", async (t) => {
  const { db, track, read } = await fixture(t);
  await track(1);
  for (const [user, instant] of [
    [1, "2026-08-31T15:59:59.999Z"], [2, "2026-08-31T16:00:00Z"],
    [3, "2026-09-01T12:00:00Z"], [4, "2026-09-30T15:59:59.999Z"],
    [5, "2026-09-30T16:00:00Z"],
  ]) {
    await db.query(`insert into public.listen_bar_track_reactions(track_id,user_id,vote_date,reaction)
      values ($1,$2,($3::timestamptz at time zone 'Asia/Taipei')::date,'heart')`, [id(1), id(user), instant]);
  }
  // Test the closed-month SQL directly with an end-of-month statement clock.
  // This substitution is isolated; production uses PostgreSQL statement time.
  const fn = (await db.query("select pg_get_functiondef('public.monthly_chart_candidates(date)'::regprocedure) as def")).rows[0].def;
  await db.exec(fn.replaceAll("statement_timestamp()", "'2026-10-01T00:00:00+08:00'::timestamptz"));
  const result = await read();
  assert.equal(result.tracks[0].supporterCount, 3);
  assert.equal(result.tracks[0].rank, 1);
});

dbTest("closure is immutable, hides unavailable history without reranking, and keeps genre ranks", async (t) => {
  const { db, track, heart, read, month } = await fixture(t);
  for (let n = 1; n <= 3; n++) {
    await track(n, n === 3 ? "Band Rock 熱血搖滾" : "EDM 百大電音");
    for (let u = 1; u <= (n === 3 ? 3 : 4); u++) await heart(n, u);
  }
  await month("2026-10");
  // First source mutation closes September BEFORE hiding its first song.
  await db.query("update public.listen_bar_tracks set hidden_at=now() where id=$1", [id(1)]);
  const first = await read("2026-09");
  assert.equal(first.status, "final");
  assert.ok(first.finalizedAt);
  assert.deepEqual(first.availableMonths, ["2026-10", "2026-09"]);
  assert.deepEqual(first.tracks.map((r) => r.rank), [1, 3]);
  assert.equal((await read("2026-09", "Band Rock 熱血搖滾")).tracks[0].rank, 1);
  await db.query("delete from public.listen_bar_track_reactions where track_id=$1", [id(3)]);
  await db.query("update public.listen_bar_tracks set title='Changed',genre='EDM 百大電音' where id=$1", [id(3)]);
  assert.deepEqual((await read("2026-09")).tracks, first.tracks);
  assert.equal((await db.query("select public.finalize_monthly_charts() as count")).rows[0].count, 0);
  assert.equal((await read("2026-09")).finalizedAt, first.finalizedAt);
  await db.query("delete from public.listen_bar_tracks where id=$1", [id(2)]);
  assert.deepEqual((await read("2026-09")).tracks.map((r) => r.rank), [3]);
  for (const table of ["monthly_chart_config", "monthly_chart_entries", "monthly_chart_months"]) {
    await assert.rejects(db.exec(`delete from public.${table}`), /MONTHLY_CHART_IMMUTABLE/);
    await assert.rejects(db.exec(`truncate public.${table} cascade`), /MONTHLY_CHART_IMMUTABLE/);
  }
  await assert.rejects(db.exec("update public.monthly_chart_entries set supporter_count=999"), /MONTHLY_CHART_IMMUTABLE/);
  await assert.rejects(db.exec("update public.monthly_chart_config set first_month='2026-01-01'"), /MONTHLY_CHART_IMMUTABLE/);
});

dbTest("cron/lazy finalizes empty months exactly once, never creates months before launch", async (t) => {
  const { db, read, month } = await fixture(t);
  await month("2026-12");
  assert.equal((await db.query("select public.finalize_monthly_charts() as count")).rows[0].count, 3);
  assert.equal((await db.query("select public.finalize_monthly_charts() as count")).rows[0].count, 0);
  const result = await read("2026-09");
  assert.deepEqual(result.availableMonths, ["2026-12", "2026-11", "2026-10", "2026-09"]);
  assert.equal(result.status, "final");
  assert.deepEqual(result.tracks, []);
  assert.ok(result.finalizedAt);
  assert.equal((await db.query("select count(*)::int as count from public.monthly_chart_months")).rows[0].count, 3);
});

dbTest("public availability fails closed for hidden/review/moderation/audio and permits certification", async (t) => {
  const { db, track, heart, read } = await fixture(t);
  await track(1);
  await heart(1, 1);
  for (const status of ["hidden", "removed", "completed", "rejected", "pending", "moderation_hold", "moderation hold", "unexpected"]) {
    await db.query("update public.listen_bar_tracks set review_status=$1", [status]);
    assert.deepEqual((await read()).tracks, []);
  }
  await db.exec("update public.listen_bar_tracks set review_status='approved', ai_music_showtime_certified=true");
  assert.equal((await read()).tracks.length, 1);
  for (const [column, value] of [["is_active", false], ["hidden_at", "2026-09-01"],
    ["removed_at", "2026-09-01"], ["ai_music_showtime_public_removed_at", "2026-09-01"], ["audio_path", " "], ["source", "official"]]) {
    await db.exec("begin");
    await db.query(`update public.listen_bar_tracks set ${column}=$1`, [value]);
    assert.deepEqual((await read()).tracks, []);
    await db.exec("rollback");
  }
});

dbTest("aggregation exceeds 1000 supporters and 1000 chart tracks without truncation", async (t) => {
  const { db, track, read } = await fixture(t);
  await track(1);
  await db.exec(`insert into public.listen_bar_track_reactions(track_id,user_id,vote_date,reaction)
    select '${id(1)}', ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, '2026-09-02', 'heart'
    from generate_series(1,1505) n;`);
  assert.equal((await read()).tracks[0].supporterCount, 1505);
  await db.exec(`insert into public.listen_bar_tracks(id,title,artist,genre,audio_path)
    select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'Song', 'Artist', 'EDM 百大電音', 'song.mp3'
    from generate_series(2,1205) n;
    insert into public.listen_bar_track_reactions(track_id,user_id,vote_date,reaction)
    select id, '${id(10000)}', '2026-09-02', 'heart' from public.listen_bar_tracks where id != '${id(1)}';`);
  assert.equal((await read()).tracks.length, 1205);
});

dbTest("anonymous/authenticated cannot execute RPCs or read snapshots; service cannot rewrite", async (t) => {
  const { db, read } = await fixture(t);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(read(), /permission denied/);
    await assert.rejects(db.exec("select public.finalize_monthly_charts()"), /permission denied/);
    await assert.rejects(db.exec("select public.monthly_chart_canonical_genre('台語熊 High')"), /permission denied/);
    await assert.rejects(db.exec("select public.monthly_chart_valid_genre('台語熊 High')"), /permission denied/);
    for (const name of ["monthly_chart_config", "monthly_chart_months", "monthly_chart_entries"]) {
      await assert.rejects(db.exec(`select * from public.${name}`), /permission denied/);
    }
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  assert.equal((await read()).status, "live");
  await assert.rejects(db.exec("insert into public.monthly_chart_months(month) values ('2026-08-01')"), /permission denied/);
  await assert.rejects(db.exec("select * from public.monthly_chart_candidates('2026-09-01')"), /permission denied/);
  await assert.rejects(db.exec("select public.monthly_chart_canonical_genre('台語熊 High')"), /permission denied/);
  await assert.rejects(db.exec("select public.monthly_chart_valid_genre('台語熊 High')"), /permission denied/);
  await db.exec("reset role");
});

dbTest("SQL genre canonicalization matches every API canonical genre and legacy alias", async (t) => {
  const { db } = await fixture(t);
  const source = await readFile(new URL("../src/lib/music-genres.ts", import.meta.url), "utf8");
  // Extract the data pairs to catch new aliases added to the shared API map.
  const aliases = [...source.matchAll(/\["([^"]+)", "([^"]+)"\]/g)].map((match) => match[1]);
  const inputs = [null, "", " \t\r\n", "Unknown custom style", ...MUSIC_GENRE_VALUES, ...aliases];
  for (const value of inputs) {
    for (const variant of value === null ? [null] : [value, value.toUpperCase(), `\u00a0\t${value}\n\u3000`]) {
      const actual = (await db.query("select public.monthly_chart_canonical_genre($1) as genre", [variant])).rows[0].genre;
      assert.equal(actual, canonicalMusicGenre(variant), `SQL/API genre parity: ${JSON.stringify(variant)}`);
      const valid = (await db.query("select public.monthly_chart_valid_genre($1) as valid", [variant])).rows[0].valid;
      assert.equal(valid, Boolean(variant?.trim()) && MUSIC_GENRE_VALUES.includes(canonicalMusicGenre(variant)));
    }
  }
});

dbTest("genre aliases share one live and newly frozen rank partition, without changing totals", async (t) => {
  const { db, track, heart, read, month } = await fixture(t, { canonicalGenres: false });
  for (const [n, genre, count] of [[1, "台語熊 High", 4], [2, "台語熊high", 4],
    [3, "Taiwanese Bear High", 3], [4, "台語熊 HIGH", 2], [5, "動感電音", 5]]) {
    await track(n, genre);
    for (let user = 1; user <= count; user++) await heart(n, user);
  }
  const before = await read();
  const publicTrackDefinition = (await db.query("select pg_get_functiondef('public.monthly_chart_public_track(public.listen_bar_tracks)'::regprocedure) as def")).rows[0].def;
  await db.exec(genreMigration);
  const all = await read();
  assert.deepEqual(all.tracks.map(({ id, rank, supporterCount }) => ({ id, rank, supporterCount })),
    before.tracks.map(({ id, rank, supporterCount }) => ({ id, rank, supporterCount })));
  assert.equal((await db.query("select pg_get_functiondef('public.monthly_chart_public_track(public.listen_bar_tracks)'::regprocedure) as def")).rows[0].def, publicTrackDefinition);
  for (const filter of ["台語熊high", "台語熊 High", "TAIWANESE BEAR HIGH"]) {
    const live = await read(null, filter);
    assert.deepEqual(live.tracks.map(({ id, genre, rank, supporterCount }) => ({ id, genre, rank, supporterCount })), [
      { id: id(1), genre: "台語熊high", rank: 1, supporterCount: 4 },
      { id: id(2), genre: "台語熊high", rank: 1, supporterCount: 4 },
      { id: id(3), genre: "台語熊high", rank: 3, supporterCount: 3 },
      { id: id(4), genre: "台語熊high", rank: null, supporterCount: 2 },
    ]);
  }
  const live = await read(null, "台語熊high");
  await month("2026-10");
  const final = await read("2026-09", "台語熊high");
  assert.equal(final.status, "final");
  assert.deepEqual(final.tracks, live.tracks);
  await db.exec(genreMigration);
  assert.deepEqual((await read("2026-09", "台語熊high")).tracks, live.tracks);
  await db.query("update public.listen_bar_tracks set hidden_at=now() where id=$1", [id(1)]);
  assert.deepEqual((await read("2026-09", "台語熊high")).tracks.map((r) => r.rank), [1, 3, null]);
});

dbTest("additive normalization preserves old snapshot bytes, original labels/ranks and launch config", async (t) => {
  const { db, track, heart, read, month } = await fixture(t, { canonicalGenres: false });
  for (const [n, genre, supporters] of [[1, "台語熊 High", 4], [2, "台語熊high", 3]]) {
    await track(n, genre);
    for (let u = 1; u <= supporters; u++) await heart(n, u);
  }
  await month("2026-10");
  const before = await read("2026-09");
  const dump = async () => (await db.query(`select jsonb_build_object(
    'config', (select jsonb_agg(c) from public.monthly_chart_config c),
    'months', (select jsonb_agg(to_jsonb(m) - 'scoring_version' order by month) from public.monthly_chart_months m),
    'entries', (select jsonb_agg(e order by month,track_id) from public.monthly_chart_entries e),
    'tracks', (select jsonb_agg(t order by id) from public.listen_bar_tracks t),
    'reactions', (select jsonb_agg(r order by track_id,user_id,vote_date) from public.listen_bar_track_reactions r)
    )::text as state`)).rows[0].state;
  const oldState = await dump();
  await db.exec(genreMigration);
  await db.exec(genreMigration);
  assert.equal(await dump(), oldState);
  assert.deepEqual(await read("2026-09"), before);
  const filtered = await read("2026-09", "台語熊high");
  assert.deepEqual(filtered.tracks.map((r) => [r.genre, r.rank]), [["台語熊 High", 1], ["台語熊high", 1]]);
  assert.equal(await dump(), oldState);
  await assert.rejects(db.exec("update public.monthly_chart_entries set genre='台語熊high'"), /MONTHLY_CHART_IMMUTABLE/);
  await assert.rejects(read("2026-08"), /MONTHLY_CHART_NOT_ENABLED/);
});

dbTest("snapshot headers identify immutable v1 scoring for existing and future closed months", async (t) => {
  const { db, month, read } = await fixture(t, { canonicalGenres: false });
  await month("2026-10");
  await read("2026-09");
  await db.exec(genreMigration);
  await db.exec(genreMigration);
  await month("2026-11");
  await read("2026-10");
  assert.deepEqual((await db.query("select to_char(month,'YYYY-MM') as month,scoring_version from public.monthly_chart_months order by month")).rows, [
    { month: "2026-09", scoring_version: "distinct_non_author_heart_v1" },
    { month: "2026-10", scoring_version: "distinct_non_author_heart_v1" },
  ]);
  for (const version of [null, "", "unsupported_scoring_v2"]) {
    await assert.rejects(db.query("insert into public.monthly_chart_months(month,scoring_version) values ('2026-11-01',$1)", [version]),
      (error) => error.code === "23502" || error.code === "23514");
  }
  await assert.rejects(db.exec("update public.monthly_chart_months set scoring_version='unsupported_scoring_v2'"), /MONTHLY_CHART_IMMUTABLE/);
  assert.equal((await db.query("select count(*)::int as count from public.monthly_chart_months")).rows[0].count, 2);
});

dbTest("Explore-only loss retirement does not disqualify a still-public Bar song", async (t) => {
  const { db, track, heart, read } = await fixture(t);
  await db.exec("alter table public.listen_bar_tracks add column official_losses integer default 0, add column retired_from_explore boolean default false");
  await track(1);
  for (let u = 1; u <= 3; u++) await heart(1, u);
  const before = await read();
  await db.exec("update public.listen_bar_tracks set official_losses=8,retired_from_explore=true");
  assert.deepEqual(await read(), before);
  await db.exec("update public.listen_bar_tracks set hidden_at=now()");
  assert.deepEqual((await read()).tracks, []);
});

dbTest("unknown, missing and blank genres are excluded before ranking and never snapshotted", async (t) => {
  const { db, track, heart, read, month } = await fixture(t);
  const genres = ["台語熊 High", "Not a supported genre", null, "", " \t\u00a0\u3000"];
  for (const [index, genre] of genres.entries()) {
    await track(index + 1, genre);
    for (let u = 1; u <= (index === 0 ? 3 : 4); u++) await heart(index + 1, u);
  }
  const sourceRows = (await db.query("select id,genre from public.listen_bar_tracks order by id")).rows;
  const live = await read();
  assert.deepEqual(live.tracks.map((r) => [r.id, r.genre, r.rank]), [[id(1), "台語熊high", 1]]);
  await assert.rejects(read(null, "Not a supported genre"), /MONTHLY_CHART_INVALID_GENRE/);
  await month("2026-10");
  assert.deepEqual((await read("2026-09")).tracks, live.tracks);
  assert.deepEqual((await db.query("select track_id from public.monthly_chart_entries")).rows, [{ track_id: id(1) }]);
  assert.deepEqual((await db.query("select id,genre from public.listen_bar_tracks order by id")).rows, sourceRows);
  await db.query("update public.listen_bar_tracks set genre='Unsupported' where id=$1", [id(1)]);
  assert.deepEqual((await read("2026-09")).tracks, []);
  await db.query("update public.listen_bar_tracks set genre='台語熊high' where id=$1", [id(1)]);
  assert.deepEqual((await read("2026-09")).tracks, live.tracks);
});

dbTest("invalid genres in pre-fix history are masked, not rewritten or reranked", async (t) => {
  const { db, track, heart, read, month } = await fixture(t, { canonicalGenres: false });
  await track(1, "Unknown genre");
  await track(2, "EDM 百大電音");
  for (const [n, count] of [[1, 4], [2, 3]]) {
    for (let u = 1; u <= count; u++) await heart(n, u);
  }
  await month("2026-10");
  assert.deepEqual((await read("2026-09")).tracks.map((r) => r.rank), [1, 2]);
  const snapshot = (await db.query("select * from public.monthly_chart_entries order by track_id")).rows;
  await db.exec(genreMigration);
  assert.deepEqual((await read("2026-09")).tracks.map((r) => [r.id, r.rank]), [[id(2), 2]]);
  await db.query("update public.listen_bar_tracks set genre='EDM 百大電音' where id=$1", [id(1)]);
  assert.deepEqual((await read("2026-09")).tracks.map((r) => [r.id, r.rank]), [[id(2), 2]]);
  assert.deepEqual((await db.query("select * from public.monthly_chart_entries order by track_id")).rows, snapshot);
});

dbTest("effective Heart cancellation retains a supporter until their last monthly Heart is gone", async (t) => {
  const { db, track, heart, read } = await fixture(t);
  await track(1);
  await heart(1, 1, "2026-09-02");
  await heart(1, 1, "2026-09-03");
  await db.query("delete from public.listen_bar_track_reactions where track_id=$1 and vote_date='2026-09-03'", [id(1)]);
  assert.equal((await read()).tracks[0].supporterCount, 1);
  await db.query("update public.listen_bar_track_reactions set reaction='thumb' where track_id=$1", [id(1)]);
  assert.deepEqual((await read()).tracks, []);
});

dbTest("pre-write closure protects history when the first next-month action cancels a Heart", async (t) => {
  const { db, month, track, heart, read } = await fixture(t);
  await track(1);
  for (let user = 1; user <= 3; user++) await heart(1, user);
  await month("2026-10");
  await db.query("delete from public.listen_bar_track_reactions where track_id=$1", [id(1)]);
  assert.equal((await read("2026-09")).tracks[0].supporterCount, 3);
  assert.deepEqual((await read("2026-10")).tracks, []);
});

dbTest("small-data write/closure timing is observable without imposing environment-dependent limits", async (t) => {
  const { db, read, month } = await fixture(t);
  await db.exec(`insert into public.listen_bar_tracks(id,title,artist,genre,audio_path)
    select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'Song', 'Artist', 'EDM 百大電音', 'song.mp3'
    from generate_series(1,196) n;`);
  const start = performance.now();
  for (let n = 1; n <= 100; n++) {
    await db.query("update public.listen_bar_tracks set title='Song' where id=$1", [id(n)]);
  }
  const writes = performance.now() - start;
  const readStart = performance.now();
  await read();
  const readMs = performance.now() - readStart;
  await month("2026-10");
  const closeStart = performance.now();
  await db.query("select public.finalize_monthly_charts()");
  t.diagnostic(`Isolated PGlite (not production): 196 tracks, 100 serialized writes ${writes.toFixed(1)}ms (${(writes / 100).toFixed(2)}ms/write); empty live read ${readMs.toFixed(1)}ms; empty month closure ${(performance.now() - closeStart).toFixed(1)}ms.`);
});

// New labels must be accepted by the actual DB filter as well as the web menu.
dbTest("three added genres support live chart filters and idempotent migration", async t => {
  const { db, track, heart, read } = await fixture(t);
  await db.exec(addedGenresMigration);
  for (const [index, genre] of MUSIC_GENRE_VALUES.slice(-3).entries()) {
    await track(index + 1, genre);
    await heart(index + 1, 1); await heart(index + 1, 2); await heart(index + 1, 3);
    const result = await read(null, genre);
    assert.equal(result.tracks.length, 1);
    assert.equal(result.tracks[0].genre, genre);
    assert.equal(result.tracks[0].supporterCount, 3);
  }
});
