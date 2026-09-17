import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pathToFileURL } from "node:url";

const modulePath = process.env.SHOWTIME_PGLITE_MODULE ?? process.env.MONTHLY_CHART_PGLITE_MODULE;
const migration = readFileSync(new URL("../supabase/migrations/20260917152244_retire_showtime_certification.sql", import.meta.url), "utf8");
const dbTest = (name, fn) => test(name, { skip: !modulePath && "Set SHOWTIME_PGLITE_MODULE for isolated PostgreSQL tests" }, fn);

async function fixture(t) {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table listen_bar_tracks (
      id text primary key, title text, audio_path text, heart_count int default 7,
      is_active boolean default true, review_status text default 'approved',
      hidden_at timestamptz, removed_at timestamptz,
      ai_music_showtime_public_removed_at timestamptz,
      ai_music_showtime_public_removed_by uuid,
      ai_music_showtime_public_removal_note text,
      ai_music_showtime_certified boolean default false,
      ai_music_showtime_certified_at timestamptz,
      ai_music_showtime_certification_source text,
      ai_music_challenge_status text default 'open',
      ai_music_challenge_updated_at timestamptz default now()
    );
    grant select on listen_bar_tracks to anon;
    grant select, update on listen_bar_tracks to authenticated;
    grant all on listen_bar_tracks to service_role;
    create table ai_music_challenge_invites(defender_track_id text, battle_id text,
      challenger_user_id text, defender_user_id text, status text);
    create table battles(id text primary key, battle_type text, winner text);
    create table battle_result_archives(battle_id text, winner text, result_payload jsonb,
      total_votes int, archived_at timestamptz);
    create table favorites(track_id text);
    insert into listen_bar_tracks(id,title,audio_path,ai_music_showtime_certified,
      ai_music_showtime_certified_at,ai_music_showtime_certification_source)
      values ('old','Original','original.mp3',true,'2026-07-01','airplay'),
        ('new','New','new.mp3',false,null,null), ('defense','Defense','defense.mp3',false,null,null),
        ('duplicate','Duplicate','duplicate.mp3',false,null,null), ('low','Low','low.mp3',false,null,null);
    insert into favorites values ('old');
    insert into listen_bar_tracks(id,review_status,hidden_at,ai_music_showtime_certified)
      values ('hidden','moderation_hold','2026-08-01',true);
    insert into battles select 'b'||n, 'ai_music_challenge','fighter_a' from generate_series(1,18) n;
    insert into ai_music_challenge_invites
      select case when n<=6 then 'defense' when n<=12 then 'duplicate' else 'low' end,
        'b'||n, case when n<=6 then 'challenger'||n else 'same' end,'defender','accepted'
      from generate_series(1,18) n;
    insert into battle_result_archives
      select 'b'||n, 'fighter_a', jsonb_build_object('audienceCount',case when n<=12 then 3 else 2 end),
        20,'2026-09-01' from generate_series(1,18) n;
    insert into listen_bar_tracks(id,audio_path) values ('future','future.mp3');
    insert into battles select 'b'||n,'ai_music_challenge','fighter_a' from generate_series(19,24) n;
    insert into ai_music_challenge_invites
      select 'future','b'||n,'challenger'||n,'defender','accepted' from generate_series(19,24) n;
    insert into battle_result_archives
      select 'b'||n,'fighter_a','{"audienceCount":3}'::jsonb,3,'2026-09-17 15:22:44.001+00'
      from generate_series(19,24) n;
  `);
  return db;
}

dbTest("retirement preserves tracks/audio/favorites/results and opts out only historical certified works", async (t) => {
  const db = await fixture(t);
  const before = (await db.query("select * from battle_result_archives order by battle_id")).rows;
  await db.exec(migration);
  const rows = (await db.query("select * from listen_bar_tracks order by id")).rows;
  const byId = Object.fromEntries(rows.map((row) => [row.id,row]));
  for (const id of ['old','defense','hidden']) {
    assert.equal(byId[id].ai_music_challenge_status,'showcase');
    assert.ok(byId[id].ai_music_certification_retired_at);
  }
  for (const id of ['new','duplicate','low','future']) {
    assert.equal(byId[id].ai_music_challenge_status,'open');
    assert.equal(byId[id].ai_music_certification_retired_at,null);
  }
  assert.equal(byId.defense.ai_music_showtime_certified,false);
  assert.equal(byId.old.ai_music_showtime_certified,true);
  assert.equal(byId.old.audio_path,'original.mp3');
  assert.equal(byId.old.heart_count,7);
  assert.equal(byId.hidden.review_status,'moderation_hold');
  assert.ok(byId.hidden.hidden_at);
  assert.equal((await db.query('select * from favorites')).rows.length,1);
  assert.deepEqual((await db.query("select * from battle_result_archives order by battle_id")).rows,before);
  await db.exec("update listen_bar_tracks set ai_music_challenge_status='open' where id='old'");
  const marker = (await db.query("select ai_music_certification_retired_at from listen_bar_tracks where id='old'")).rows[0];
  await db.exec("set role authenticated; update listen_bar_tracks set ai_music_certification_retired_at=null where id='old'; update listen_bar_tracks set ai_music_certification_retired_at=now() where id='new'; reset role;");
  assert.deepEqual((await db.query("select ai_music_certification_retired_at from listen_bar_tracks where id='old'")).rows[0], marker);
  assert.equal((await db.query("select ai_music_certification_retired_at from listen_bar_tracks where id='new'")).rows[0].ai_music_certification_retired_at,null);
  await db.exec(migration);
  assert.equal((await db.query("select ai_music_challenge_status from listen_bar_tracks where id='old'")).rows[0].ai_music_challenge_status,'open');
});

dbTest("direct, legacy RPC and trigger writes cannot regenerate certification or rewrite history", async (t) => {
  const db = await fixture(t);
  await db.exec(migration);
  await db.exec(`
    create function old_certify() returns void language sql as $$
      update listen_bar_tracks set ai_music_showtime_certified=true,
        ai_music_showtime_certified_at=now(), ai_music_showtime_certification_source='defense',
        ai_music_challenge_status='showcase' where id='new';
    $$;
    select old_certify();
    create function old_auto_certify() returns trigger language plpgsql as $$
      begin new.ai_music_showtime_certified := true; return new; end; $$;
    create trigger old_auto_certify before update on listen_bar_tracks
      for each row execute function old_auto_certify();
    update listen_bar_tracks set title='Edited' where id='new';
    insert into listen_bar_tracks(id,ai_music_showtime_certified,ai_music_showtime_certified_at)
      values ('inserted',true,now());
    update listen_bar_tracks set ai_music_showtime_certified=false,
      ai_music_showtime_certification_source='battle' where id='old';
  `);
  const rows = (await db.query("select * from listen_bar_tracks")).rows;
  const byId = Object.fromEntries(rows.map((row) => [row.id,row]));
  assert.equal(byId.new.title,'Edited');
  assert.equal(byId.new.ai_music_showtime_certified,false);
  assert.equal(byId.new.ai_music_challenge_status,'open');
  assert.equal(byId.inserted.ai_music_showtime_certified,false);
  assert.equal(byId.old.ai_music_showtime_certified,true);
  assert.equal(byId.old.ai_music_showtime_certification_source,'airplay');
  await db.exec(`create trigger zzzzz_late_certify before update on listen_bar_tracks
    for each row execute function old_auto_certify()`);
  await assert.rejects(db.exec("update listen_bar_tracks set title='Rejected' where id='new'"), /immutable/);
});

dbTest("existing table permissions survive without granting public RPC execution", async (t) => {
  const db = await fixture(t);
  const acl = (await db.query("select relacl::text from pg_class where oid='listen_bar_tracks'::regclass")).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query("select relacl::text from pg_class where oid='listen_bar_tracks'::regclass")).rows,acl);
  for (const role of ['anon','authenticated']) {
    const result = await db.query(`select has_function_privilege($1,'freeze_retired_showtime_certification()','execute') as allowed`,[role]);
    assert.equal(result.rows[0].allowed,false);
  }
  await db.exec("set role authenticated; update listen_bar_tracks set title='Owner edit' where id='old'; reset role;");
  assert.equal((await db.query("select title from listen_bar_tracks where id='old'")).rows[0].title,'Owner edit');
});
