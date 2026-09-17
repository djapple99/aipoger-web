import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const modulePath = process.env.MONTHLY_CHART_PGLITE_MODULE;
const dbTest = (name, fn) => test(name, { skip: !modulePath && "PGlite unavailable" }, fn);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migrations = await Promise.all(["20260917151525_monthly_charts.sql", "20260917153446_monthly_chart_canonical_genres.sql", "20260917180000_monthly_chart_owner_decisions.sql"].map((name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8")));
async function fixture(t) {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table listen_bar_tracks(id uuid primary key,title text,artist text,genre text,ai_tool text,lyrics text,
      audio_path text,cover_path text,source text default 'community',is_active boolean default true,
      review_status text default 'approved',hidden_at timestamptz,removed_at timestamptz,
      ai_music_showtime_public_removed_at timestamptz,created_by uuid,created_at timestamptz default '2026-09-01');
    create table listen_bar_track_reactions(track_id uuid references listen_bar_tracks(id) on delete cascade,
      user_id uuid,vote_date date,reaction text,primary key(track_id,user_id,vote_date));`);
  for (const sql of migrations) await db.exec(sql.replace("select date_trunc('month', clock_timestamp() at time zone 'Asia/Taipei')::date;", "select date '2026-09-01';"));
  const track = async (n, count, genre = "EDM 百大電音") => {
    await db.query("insert into listen_bar_tracks(id,title,artist,genre,audio_path,created_by) values($1,$2,'Artist',$3,'song.mp3',$4)", [id(n), `Song ${n}`, genre, id(9000+n)]);
    for (let u=1;u<=count;u++) await heart(n,u);
  };
  const heart = (n,u) => db.query("insert into listen_bar_track_reactions(track_id,user_id,vote_date,reaction) values($1,$2,'2026-09-02','heart')",[id(n),id(u)]);
  const read = async (month=null,genre=null) => (await db.query("select read_monthly_chart($1,$2) as d",[month,genre])).rows[0].d;
  const decide = (ids,score=3,month="2026-09") => db.query("select decide_monthly_chart_tie($1,$2,$3,$4)",[month,score,ids.map(id),id(999)]);
  const month = () => db.exec("create or replace function monthly_chart_current_month() returns date language sql volatile set search_path='' as $$ select date '2026-10-01'; $$;");
  return {db,track,heart,read,decide,month};
}

dbTest("pending ties are not fabricated ranks; owner order applies only within equal scores and genre",async(t)=>{
  const {db,track,read,decide}=await fixture(t);
  await track(1,4); await track(2,3); await track(3,3); await track(4,3,"Band Rock 熱血搖滾"); await track(5,2);
  let d=await read();
  assert.deepEqual(d.tracks.map(x=>[x.id,x.rank,x.rankPending]),[[id(1),1,false],[id(2),null,true],[id(3),null,true],[id(4),null,true],[id(5),null,false]]);
  assert.equal((await read(null,"Band Rock 熱血搖滾")).tracks[0].rank,1);
  await decide([4,3,2]); d=await read();
  assert.deepEqual(d.tracks.map(x=>[x.id,x.rank]),[[id(1),1],[id(4),2],[id(3),3],[id(2),4],[id(5),null]]);
  assert.deepEqual((await read(null,"EDM 百大電音")).tracks.map(x=>x.rank),[1,2,3,null]);
  assert.equal((await db.query("select count(*)::int as n from listen_bar_track_reactions")).rows[0].n,15);
  await assert.rejects(decide([1,2,3]),/GROUP_CHANGED/);
  await assert.rejects(decide([2,2,3]),/GROUP_CHANGED/);
  await assert.rejects(decide([2,3]),/GROUP_CHANGED/);
});

dbTest("new votes or group members invalidate stale submissions without overwriting audit",async(t)=>{
  const {db,track,heart,read,decide}=await fixture(t);
  await track(1,3); await track(2,3); await decide([2,1]);
  await track(3,3);
  assert.ok((await read()).tracks.every(x=>x.rankPending));
  await assert.rejects(decide([2,1]),/GROUP_CHANGED/);
  await decide([3,2,1]); await heart(1,4);
  assert.equal((await read()).tracks[0].rank,1);
  await assert.rejects(decide([3,2,1]),/GROUP_CHANGED/);
  await decide([3,2]);
  assert.equal((await db.query("select count(*)::int as n from monthly_chart_decisions")).rows[0].n,3);
  await assert.rejects(db.exec("update monthly_chart_decisions set ordered_ids=member_ids"),/IMMUTABLE/);
});

dbTest("month closure freezes scores, allows pending decision once, preserves hidden historical slots",async(t)=>{
  const {db,track,read,decide,month}=await fixture(t);
  await track(1,3);await track(2,3);await month();
  let d=await read("2026-09");assert.equal(d.status,"awaiting_decision");
  await db.query("delete from listen_bar_track_reactions where track_id=$1",[id(1)]);
  assert.equal((await read("2026-09")).tracks[0].supporterCount,3);
  await decide([2,1]);d=await read("2026-09");assert.equal(d.status,"final");
  assert.deepEqual(d.tracks.map(x=>x.rank),[1,2]);
  await assert.rejects(decide([1,2]),/DECISION_FINAL/);
  await db.query("update listen_bar_tracks set is_active=false where id=$1",[id(2)]);
  assert.deepEqual((await read("2026-09")).tracks.map(x=>x.rank),[2]);
  assert.equal((await db.query("select global_rank from monthly_chart_entries limit 1")).rows[0].global_rank,1);
  assert.equal((await read()).month,"2026-10");
});

dbTest("closed pending months remain in owner inbox; migration replay preserves decisions and access",async(t)=>{
  const {db,track,read,decide,month}=await fixture(t);
  await track(1,3);await track(2,3);await month();await read();
  const admin=async()=> (await db.query("select admin_monthly_chart(null) as d")).rows[0].d;
  assert.deepEqual((await admin()).pendingMonths,[{month:"2026-09",count:1}]);
  await decide([2,1]);await db.exec(migrations[2]);
  assert.deepEqual((await admin()).pendingMonths,[]);
  assert.deepEqual((await read("2026-09")).tracks.map(x=>x.id),[id(2),id(1)]);
  for(const role of ["anon","authenticated"]){
    await db.exec(`set role ${role}`);
    await assert.rejects(db.exec("select admin_monthly_chart(null)"),/permission denied/);
    await assert.rejects(db.exec("select * from monthly_chart_decisions"),/permission denied/);
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  await assert.rejects(db.exec("select read_monthly_chart_base(null,null)"),/permission denied/);
  assert.equal((await admin()).chart.month,"2026-10");
});
