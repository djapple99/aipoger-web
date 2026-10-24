import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {isInDiscoveryMusicPool,musicPoolPopularityScore,musicPoolSupportCounts} from '../src/lib/music-pool.ts';
import {readAllHomePages} from '../src/lib/home-discovery.ts';
import {isPublicDiscoveryTrack} from '../src/lib/listen-bar-airplay.ts';
import {isCurrentMusicGenre} from '../src/lib/music-genres.ts';
import {popularityScore} from '../src/lib/blind-listening.ts';
import {MUSIC_POOL_RETURN_IDS,MUSIC_POOL_RETURN_EXCLUDED_IDS} from '../src/lib/music-pool-return.ts';
const source=readFileSync(new URL('../src/lib/server-public-music.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function mount(tracks,hearts,{failHearts=false,retired=[],ratings=new Map(),blind=new Map(),favorites=new Map()}={}){
 const ranges=[];
 const admin={from(table){const filters=[];let from=0,to=499;const query={select(){return query},eq(k,v){filters.push(r=>r[k]===v);return query},in(k,vs){filters.push(r=>vs.includes(r[k]));return query},gte(k,v){filters.push(r=>r[k]>=v);return query},lte(k,v){filters.push(r=>r[k]<=v);return query},not(){return query},order(){return query},limit(n){to=n-1;return query},range(a,b){from=a;to=b;ranges.push({table,from,to});return query},then(resolve,reject){const rows=table==='listen_bar_tracks'?tracks:table==='listen_bar_track_reactions'?hearts:[];return Promise.resolve({data:rows.filter(r=>filters.every(fn=>fn(r))).slice(from,to+1),error:failHearts&&table==='listen_bar_track_reactions'?{message:'reaction storage unavailable'}:null}).then(resolve,reject)}};return query}};
 const modules={'server-only':{},react:{cache:fn=>fn},'next/server':{NextResponse:{json:(data,init={})=>({data,status:init.status??200})}},'@supabase/supabase-js':{createClient:()=>admin},'@/lib/music-pool':{isInDiscoveryMusicPool,musicPoolPopularityScore,musicPoolSupportCounts},'@/lib/home-discovery':{readAllHomePages},'@/lib/ai-music-challenge-rules':{AI_MUSIC_CHALLENGE_BATTLE_TYPE:'drop'},'@/lib/ai-music-surface-lifecycle':{buildAiMusicSurfaceLifecycleMap:async()=>new Map(retired.map(id=>[id,{retiredFromExplore:true}])),isAiMusicLifecycleSchemaMissing:()=>false},'@/lib/ai-music-heat':{AI_MUSIC_HEAT_WINDOW_MS:7*86400000},'@/lib/ai-music-showtime':{AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS:''},'@/lib/drop-battle-rematch':{isOfficialDropBattleResult:()=>false},'@/lib/listen-bar':{listenBarPromotionProtectionActive:()=>false,LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS:0},'@/lib/music-genres':{isCurrentMusicGenre},'@/lib/earworm-affinity':{readEarwormAffinityMap:async()=>new Map()},'@/lib/listen-bar-airplay':{isPublicDiscoveryTrack}};
 modules['@/lib/server-blind-listening']={blindSummaries:async()=>blind};
 modules['@/lib/server-mv-reviews']={mvRatingSummaries:async()=>ratings};
 modules['@/lib/server-work-favorites']={readWorkFavoriteCounts:async()=>favorites};
 modules['@/lib/blind-listening']={popularityScore};
 const loaded={exports:{}};new Function('require','module','exports','process',compiled)(name=>{assert.ok(name in modules,name);return modules[name]},loaded,loaded.exports,{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'unit-test-only'}});
 return {get:loaded.exports.publicMusicResponse,ranges};
}
const recent=new Date(Date.now()-5*86400000).toISOString(),heartTime=new Date(Date.now()-3*86400000).toISOString();
const row=id=>({id,title:id,artist:'Creator',genre:'Jazz / Bossa 微醺時刻',audio_path:'audio.mp3',is_active:true,review_status:'approved',source:'community',created_by:'author',created_at:recent,bar_phase:'public'});
test('pool API reads every catalog page and does not stop at the old 500-track cap',async()=>{
 const tracks=Array.from({length:501},(_,i)=>row(`work-${i}`));const ui=mount(tracks,[]);const result=await ui.get();assert.equal(result.status,200);assert.equal(result.data.tracks.length,501);assert.ok(ui.ranges.some(r=>r.table==='listen_bar_tracks'&&r.from===500));
});
test('pool API paginates all effective reactions, deduplicates and excludes author; public response has only counts',async()=>{
 const tracks=[row('song')];const hearts=Array.from({length:1200},(_,i)=>({track_id:'song',user_id:`reader-${i}`,reaction:'heart',created_at:heartTime,vote_date:heartTime.slice(0,10)}));
 hearts.push({...hearts[0]},{...hearts[0],user_id:'author'},{...hearts[0],user_id:null},{...hearts[0],user_id:'star',reaction:'star'});
 const ui=mount(tracks,hearts);const result=await ui.get();assert.equal(result.status,200);assert.equal(result.data.tracks[0].ai_music_pool_supporter_count,1200);assert.ok(ui.ranges.some(r=>r.table==='listen_bar_track_reactions'&&r.from===1000));assert.equal(JSON.stringify(result.data).includes('reader-'),false);
});
test('pool API excludes expired, hidden, official and lifecycle-retired works',async()=>{
 const tracks=[row('keep'),{...row('old'),created_at:'2020-01-01T00:00:00Z'},{...row('hidden'),hidden_at:recent},{...row('official'),source:'official'},row('retired')];const result=await mount(tracks,[],{retired:['retired']}).get();assert.deepEqual(result.data.tracks.map(r=>r.id),['keep']);
});
test('support read failure never produces a fake zero ranking',async()=>{const result=await mount([row('song')],[],{failHearts:true}).get();assert.equal(result.status,500);assert.equal(result.data.tracks,undefined);assert.match(result.data.error,/unavailable/)});
test('return cohort cannot revive later removal, creator deletion, moderation hold or lifecycle retirement',async(t)=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-10-14T08:00:00+08:00'));
 const id=MUSIC_POOL_RETURN_IDS[0],old={...row(id),created_at:'2026-05-22T22:40:01Z'};
 const eligible=await mount([old],[]).get();assert.equal(eligible.data.tracks.length,1);assert.equal(eligible.data.tracks[0].ai_music_pool_supporter_count,0);assert.equal(eligible.data.tracks[0].ai_music_popularity_score,5);
 for(const patch of [{is_active:false},{hidden_at:recent},{removed_at:recent},{review_status:'removed'},{review_status:'pending'},{ai_music_showtime_public_removed_at:recent},{source:'official'}]){
  assert.equal((await mount([{...old,...patch}],[]).get()).data.tracks.length,0);
 }
 assert.equal((await mount([old],[],{retired:[id]}).get()).data.tracks.length,0);
 assert.equal((await mount([{...row(MUSIC_POOL_RETURN_EXCLUDED_IDS[0]),created_at:'2026-08-01T00:00:00Z'}],[]).get()).data.tracks.length,0);
});

test('public pool exposes only rating aggregates and adds actual scores without multiplying twice',async()=>{
 const ratings=new Map([['song',{ratingAverage:7.8,ratingCount:2,ratingTotal:15.6}]]);const blind=new Map([['song',{people:2,preferencePoints:1.5}]]);
 const hearts=[{track_id:'song',user_id:'reader',reaction:'heart',created_at:heartTime,vote_date:heartTime.slice(0,10)}];
 const result=await mount([row('song')],hearts,{ratings,blind}).get();assert.equal(result.status,200);const r=result.data.tracks[0];assert.equal(r.ai_music_rating_average,7.8);assert.equal(r.ai_music_rating_count,2);assert.equal(r.ai_music_rating_total,15.6);assert.equal(r.ai_music_popularity_score,26.1);assert.equal(r.user_id,undefined);
});

test('favorite membership is displayed separately and never changes ranking points',async()=>{
 const tracks=[row('song')];const ratings=new Map([['song',{ratingAverage:9,ratingCount:1,ratingTotal:9}]]);
 const base=await mount(tracks,[],{ratings}).get();
 const saved=await mount(tracks,[],{ratings,favorites:new Map([['song',31]])}).get();
 assert.equal(saved.data.tracks[0].ai_music_favorite_count,31);
 assert.equal(saved.data.tracks[0].ai_music_popularity_score,base.data.tracks[0].ai_music_popularity_score);
 const unavailable=await mount(tracks,[],{ratings,favorites:null}).get();
 assert.equal(unavailable.status,200);assert.equal(unavailable.data.tracks[0].ai_music_favorite_count,null);
 assert.equal(unavailable.data.tracks[0].ai_music_popularity_score,base.data.tracks[0].ai_music_popularity_score);
});
