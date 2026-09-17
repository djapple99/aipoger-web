import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL('../src/', import.meta.url));
function load(relative, mocks = {}) {
  const file = path.resolve(root, relative);
  const output = ts.transpileModule(readFileSync(file,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const require = (specifier) => {
    if (specifier in mocks) return mocks[specifier];
    const resolved = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
    return load(resolved.endsWith('.ts') ? resolved : `${resolved}.ts`, mocks);
  };
  new Function('require','module','exports','process', output)(require,loaded,loaded.exports,{
    env: { NEXT_PUBLIC_SUPABASE_URL:'https://example.test', SUPABASE_SERVICE_ROLE_KEY:'fixture-only' },
  });
  return loaded.exports;
}

const rules = load('lib/ai-music-challenge-rules.ts');
const lifecycle = load('lib/ai-music-surface-lifecycle.ts');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

function client(tables) {
  const writes = [];
  return {
    writes,
    auth: { getUser: async (token) => ({ data: { user: token === 'owner' ? { id:id(99) } : null }, error:null }) },
    from(table) {
      const filters = [];
      let patch;
      const run = (single = false) => {
        const rows = (tables[table] ?? []).filter((row) => filters.every((fn) => fn(row)));
        if (patch) for (const row of rows) { writes.push({ table, patch }); Object.assign(row,patch); }
        return { data:single ? rows[0] ?? null : rows, error:null };
      };
      const query = {
        select: () => query, order: () => query,
        eq(key,value) { filters.push((row) => row[key] === value); return query; },
        in(key,values) { filters.push((row) => values.includes(row[key])); return query; },
        not(key,operator,value) { assert.equal(operator,'is'); filters.push((row) => row[key] !== value); return query; },
        update(value) { patch=value; return query; },
        maybeSingle: async () => run(true),
        then: (resolve,reject) => Promise.resolve(run()).then(resolve,reject),
      };
      return query;
    },
  };
}

function fixtureSong(extra = {}) {
  return { id:id(1), created_by:id(99), title:'Original', artist:'Artist', source:'community',
    genre:'EDM 百大電音', is_active:true, audio_path:'immutable.mp3', heart_count:17,
    ai_music_challenge_status:'open', ai_music_showtime_certified:false, ...extra };
}

const responseMock = { NextResponse: { json: (payload,init = {}) => ({ payload,status:init.status ?? 200 }) } };
const request = (body,token = 'owner') => ({ headers:new Headers(token ? { authorization:`Bearer ${token}` } : {}), json:async () => body });

test('creator metadata route edits ALL own community songs but never audio, results, certification or challenge preference', async () => {
  for (const extra of [{}, { ai_music_showtime_certified:true }, { is_active:false, ai_music_showtime_public_removed_at:'2026-09-01' }]) {
    const song = fixtureSong(extra);
    const admin = client({ listen_bar_tracks:[song] });
    const route = load('app/api/showtime/my-tracks/route.ts', {
      'next/server':responseMock, '@supabase/supabase-js':{ createClient:() => admin },
    });
    const result = await route.PATCH(request({ trackId:song.id,title:'Updated',audio_path:'attack.mp3',
      audioPath:'attack.mp3', ai_music_showtime_certified:true, ai_music_certification_retired_at:'fake',
      ai_music_challenge_status:'showcase', wins:999, heart_count:999,
      supportUrl:'https://example.com/creator', supportLabel:'Support' }));
    assert.equal(result.status,200);
    assert.equal(song.title,'Updated');
    assert.equal(song.audio_path,'immutable.mp3');
    assert.equal(song.heart_count,17);
    assert.equal(song.ai_music_challenge_status,'open');
    assert.equal(song.ai_music_showtime_certified,extra.ai_music_showtime_certified ?? false);
    assert.equal(song.ai_music_certification_retired_at,undefined);
    assert.equal(song.wins,undefined);
    assert.equal(song.support_url_status,'pending');
    assert.equal(song.ai_music_showtime_public_removed_at,extra.ai_music_showtime_public_removed_at);
    assert.equal(admin.writes.length,1);
    assert.equal((await route.GET(request(null))).payload.tracks.length,1);
  }
});

test('metadata API preserves ownership, auth and cover path boundaries', async () => {
  const song = fixtureSong();
  const admin = client({ listen_bar_tracks:[song,fixtureSong({id:id(2),created_by:id(88)})] });
  const route = load('app/api/showtime/my-tracks/route.ts', {
    'next/server':responseMock, '@supabase/supabase-js':{ createClient:() => admin },
  });
  assert.equal((await route.PATCH(request({trackId:song.id,title:'No'},null))).status,401);
  assert.equal((await route.PATCH(request({trackId:id(2),title:'No'}))).status,404);
  assert.equal((await route.PATCH(request({trackId:song.id,coverPath:`${id(88)}/community/cover.jpg`}))).status,400);
  assert.equal((await route.PATCH(request({trackId:song.id,supportUrl:'http://example.com'}))).status,400);
  assert.equal(admin.writes.length,0);
});

test('direct challenge preference API blocks moderation and allows only explicit eligible reopening', async () => {
  for (const review_status of [null,'approved','pending','completed','moderation_hold','moderation-hold','moderation hold','hidden','removed','rejected']) {
    const song=fixtureSong({ review_status,ai_music_showtime_certified:true,
      ai_music_challenge_status:'showcase',ai_music_defender_drop_audio_path:'drop.mp3' });
    const admin=client({listen_bar_tracks:[song]});
    const route=load('app/api/ai-music/challenges/route.ts',{
      'next/server':responseMock,'@supabase/supabase-js':{createClient:() => admin},
      '@/lib/battle-pool-client':{},
    });
    const result=await route.PATCH(request({trackId:song.id,status:'open'}));
    const eligible=review_status===null || review_status==='approved';
    assert.equal(result.status,eligible ? 200 : 409, String(review_status));
    assert.equal(song.ai_music_challenge_status,eligible ? 'open' : 'showcase');
    assert.equal(admin.writes.length,eligible ? 1 : 0);
  }
});

test('official lifecycle ignores 0/1/2 audiences, preserves real W/L and never promotes six new wins', async () => {
  const tables = { ai_music_challenge_invites:[], battles:[], battle_result_archives:[] };
  for (let n=0;n<10;n++) {
    const winner = n===9 ? 'fighter_b' : 'fighter_a';
    tables.ai_music_challenge_invites.push({ defender_track_id:id(1),battle_id:id(100+n),
      challenger_user_id:id(200+n),defender_user_id:id(99),status:'accepted' });
    tables.battles.push({ id:id(100+n),battle_type:'ai_music_challenge',winner });
    tables.battle_result_archives.push({ battle_id:id(100+n),winner,total_votes:20,
      result_payload:{ audienceCount:n<3 ? n : 3 } });
  }
  const song=fixtureSong();
  const admin=client(tables);
  const stats=(await lifecycle.buildAiMusicSurfaceLifecycleMap(admin,[song])).get(song.id);
  assert.equal(stats.officialWins,6);
  assert.equal(stats.officialLosses,1);
  assert.equal(stats.officialChallengeCount,7);
  assert.equal(stats.officialDefenseSuccesses,6);
  assert.equal(stats.isShowtimeCertified,false);
  assert.equal(stats.retiredFromExplore,false);
  assert.equal(admin.writes.length,0);
});

test('legacy persisted or migration-snapshotted exemptions survive eight losses without a challenge gate', async () => {
  for (const row of [fixtureSong({ai_music_showtime_certified:true}),fixtureSong({ai_music_certification_retired_at:'2026-09-17'})]) {
    const tables={ ai_music_challenge_invites:[],battles:[],battle_result_archives:[] };
    for (let n=0;n<8;n++) {
      tables.ai_music_challenge_invites.push({defender_track_id:row.id,battle_id:id(n+100),challenger_user_id:id(n+200),defender_user_id:id(99),status:'accepted'});
      tables.battles.push({id:id(n+100),battle_type:'ai_music_challenge',winner:'fighter_b'});
      tables.battle_result_archives.push({battle_id:id(n+100),winner:'fighter_b',result_payload:{audienceCount:3}});
    }
    const stats=(await lifecycle.buildAiMusicSurfaceLifecycleMap(client(tables),[row])).get(row.id);
    assert.equal(stats.officialLosses,8);
    assert.equal(stats.retiredFromExplore,false);
    assert.equal(rules.isAiMusicTrackChallengeableOnExplore('showcase','drop.mp3',stats),false);
    assert.equal(rules.isAiMusicTrackChallengeableOnExplore('open','drop.mp3',stats),true);
  }
});
