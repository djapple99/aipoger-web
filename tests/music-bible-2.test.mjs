import assert from 'node:assert/strict';
import test from 'node:test';
import { bibleCatalogDefaults, mergeBibleCatalog, sanitizeBiblePayload } from '../src/lib/ai-music-bible-content.ts';
import { SUNO_PROMPT_MOVES, SUNO_LYRIC_MOVES } from '../src/lib/suno-practice-library.ts';
import { TAIWANESE_LYRICS_ENTRIES } from '../src/lib/taiwanese-lyrics-lab.ts';
import { SUNO_ARTIST_DNA_ENTRIES, SUNO_PROMPT_RECIPES } from '../src/lib/suno-inspiration-index.ts';
import { legacyBibleMetadata, sanitizeBibleMetadata, withBibleMetadata } from '../src/lib/bible-metadata.ts';

const withoutMetadata = (item) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== "metadata"));
const verified = { platform: 'Suno', model: 'Test model', modelVersion: 'Test version', lastVerifiedAt: '2026-09-28', status: 'Verified' };

test('2.0 preserves every legacy ID, prompt, source, search string, order, and count', () => {
  const defaults = bibleCatalogDefaults();
  const merged = mergeBibleCatalog([]);
  for (const [key, original] of [['promptMoves', SUNO_PROMPT_MOVES], ['lyricMoves', SUNO_LYRIC_MOVES], ['taiwaneseEntries', TAIWANESE_LYRICS_ENTRIES]]) {
    assert.deepEqual(defaults[key].map(withoutMetadata), original);
    assert.deepEqual(merged[key], defaults[key]);
    assert.ok(defaults[key].every(item => JSON.stringify(item.metadata) === JSON.stringify(legacyBibleMetadata())));
  }
  for (const original of [SUNO_ARTIST_DNA_ENTRIES, SUNO_PROMPT_RECIPES]) {
    const enriched = original.map(withBibleMetadata);
    assert.deepEqual(enriched.map(withoutMetadata), original);
    assert.ok(enriched.every(item => item.metadata.status === 'Legacy' && item.metadata.lastVerifiedAt === null));
  }
});

test('metadata changes survive merge without changing historical prompt or evidence', () => {
  for (const status of ['Verified', 'Experimental', 'Legacy', 'Deprecated']) {
    const metadata = {...verified, status};
    const payload = sanitizeBiblePayload({metadata});
    const result = mergeBibleCatalog([{content_kind:'prompt_move',content_key:SUNO_PROMPT_MOVES[0].key,payload,updated_by:null,updated_at:'2026-09-28'}]);
    assert.deepEqual(result.promptMoves[0].metadata, metadata);
    assert.deepEqual(withoutMetadata(result.promptMoves[0]), SUNO_PROMPT_MOVES[0]);
    assert.equal(result.promptMoves.length, SUNO_PROMPT_MOVES.length);
  }
});

test('validation rejects invalid dates, incomplete Verified claims and unknown statuses', () => {
  for (const lastVerifiedAt of ['2026-02-30','2026-13-01','yesterday','2026-9-28','2026-09-28T00:00:00Z']) assert.equal(sanitizeBibleMetadata({...verified,lastVerifiedAt}),null);
  for (const key of ['model','modelVersion','lastVerifiedAt']) assert.equal(sanitizeBiblePayload({title:{zh:'Keep'},metadata:{...verified,[key]:null}}),null);
  assert.equal(sanitizeBibleMetadata({...verified,status:'Published'}),null);
  assert.equal(sanitizeBibleMetadata({...verified,platform:' '.repeat(5)}),null);
  assert.equal(sanitizeBibleMetadata({...verified,model:'x'.repeat(121)}),null);
  assert.deepEqual(sanitizeBibleMetadata({...legacyBibleMetadata(), extra:'ignore'}),legacyBibleMetadata());
  assert.deepEqual(sanitizeBibleMetadata({...verified,lastVerifiedAt:'2024-02-29'}),{...verified,lastVerifiedAt:'2024-02-29'});
});

test('old payloads work and explicit nulls clear verification without inventing dates', () => {
  assert.deepEqual(sanitizeBiblePayload({note:'  historical  '}),{note:'historical'});
  assert.deepEqual(sanitizeBiblePayload({metadata:legacyBibleMetadata()}),{metadata:legacyBibleMetadata()});
  const original={key:'original',metadata:verified};
  assert.deepEqual(withBibleMetadata(original).metadata,verified);
  assert.equal(SUNO_PROMPT_MOVES[0].metadata,undefined);
});

// Execute the real member route with isolated auth/storage I/O.
import { loadTs } from './helpers/choice-runtime.mjs';
import * as catalogModule from '../src/lib/ai-music-bible-content.ts';
import * as inspirationModule from '../src/lib/suno-inspiration-index.ts';
import * as practiceModule from '../src/lib/suno-practice-library.ts';
import * as stemModule from '../src/lib/stem-separation-guide.ts';
import * as metadataModule from '../src/lib/bible-metadata.ts';

test('member API keeps authentication, private caching, missing-table fallback and all metadata', async (t) => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-only';
  t.after(() => {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });
  let reads=0;
  const route=loadTs('src/app/api/ai-music-bible/content/route.ts', {
    '@/lib/ai-music-bible-content': catalogModule,
    '@/lib/suno-inspiration-index': inspirationModule,
    '@/lib/suno-practice-library': practiceModule,
    '@/lib/stem-separation-guide': stemModule,
    '@/lib/bible-metadata': metadataModule,
    '@supabase/supabase-js': {createClient:()=>({auth:{getUser:async token=>({data:{user:token==='member'?{id:'test-member'}:null}})},from:()=>({select:async()=>{reads++;return {data:null,error:{code:'42P01',message:'relation does not exist'}};}})})},
  });
  const request=token=>({headers:new Headers(token?{authorization:`Bearer ${token}`}:{})});
  assert.equal((await route.GET(request())).status,401);
  assert.equal((await route.GET(request('invalid'))).status,401);
  assert.equal(reads,0);
  const response=await route.GET(request('member'));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const body=await response.json();
  assert.equal(body.schemaReady,false);
  for (const [key,count] of [['promptMoves',163],['lyricMoves',21],['taiwaneseEntries',38],['artistDnaEntries',772],['promptRecipes',747]]) {
    assert.equal(body[key].length,count);
    assert.ok(body[key].every(item=>item.metadata.status==='Legacy' && item.metadata.lastVerifiedAt===null));
  }
});

test('owner metadata-only updates retain editorial overrides; old editors retain verification', async (t) => {
  const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
  t.after(()=>{for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',oldUrl],['SUPABASE_SERVICE_ROLE_KEY',oldKey]]) {if(value===undefined) delete process.env[key];else process.env[key]=value;}});
  let stored={title:{zh:'歷史編輯標題'},copy:{zh:'DO NOT ERASE THIS PROMPT'}};
  let writes=0;
  const client={auth:{getUser:async()=>({data:{user:{id:'owner',email:'owner@example.test'}}})},from:()=>{
    const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{payload:stored}}),upsert:row=>{stored=row.payload;writes++;return query;},single:async()=>({data:{payload:stored}})};
    return query;
  }};
  const route=loadTs('src/app/api/admin/ai-music-bible/content/route.ts',{
    '@/lib/ai-music-bible-content':catalogModule,
    '@/lib/admin-emails':{isAdminEmail:email=>email==='owner@example.test'},
    '@supabase/supabase-js':{createClient:()=>client},
  });
  const request=payload=>({headers:new Headers({authorization:'Bearer owner'}),nextUrl:{origin:'https://test.invalid'},json:async()=>({kind:'prompt_move',key:SUNO_PROMPT_MOVES[0].key,payload})});
  assert.equal((await route.PATCH(request({metadata:verified}))).status,200);
  assert.equal(stored.copy.zh,'DO NOT ERASE THIS PROMPT');
  assert.deepEqual(stored.metadata,verified);
  assert.equal((await route.PATCH(request({title:{zh:'新版標題'}}))).status,200);
  assert.deepEqual(stored.metadata,verified);
  assert.equal(stored.copy.zh,'DO NOT ERASE THIS PROMPT');
  assert.equal((await route.PATCH(request({metadata:{...verified,lastVerifiedAt:null}}))).status,400);
  assert.equal(writes,2);
});
