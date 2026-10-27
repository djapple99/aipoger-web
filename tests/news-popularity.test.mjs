import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './helpers/choice-runtime.mjs';

const stories=[{slug:'old',publishedOn:'2026-10-20'},{slug:'new',publishedOn:'2026-10-27'},{slug:'hidden',publishedOn:'2026-10-26'}];
function setup({fail=false,zero=false,missing=false}={}) {
 const requests=[];
 const admin={from(table){
  const filters={},request={table,filters};requests.push(request);
  const q={select(columns,options){request.columns=columns;request.options=options;return q;},eq(k,v){filters[k]=v;return q;},abortSignal(signal){assert.ok(signal instanceof AbortSignal);return q;},then(resolve,reject){
   const count=zero?0:table==='music_news_likes'?{old:3,new:1,hidden:0}[filters.article_slug]:filters.moderation_status==='visible'?{old:0,new:2,hidden:0}[filters.article_slug]:100;
   return Promise.resolve({count:missing?null:count,error:fail?{message:'private database details'}:null}).then(resolve,reject);
  }};return q;
 }};
 const mod=loadTs('src/lib/server-news-popularity.ts',{
  'server-only':{},'next/cache':{unstable_cache:fn=>fn},
  '@/lib/server-mv-reviews':{mvReviewAdmin:()=>admin},
  '@/lib/music-news':{publishedMusicNews:()=>[stories[1],stories[2],stories[0]]},
 });
 return {mod,admin,requests};
}
test('news popularity counts only visible engagement, ranks totals then dates, and never reads private rows',async()=>{
 const {mod,admin,requests}=setup();
 assert.deepEqual(await mod.readNewsPopularity(stories,admin),{slugs:['new','old','hidden'],status:'ranked'});
 assert.equal(requests.length,6);
 for(const req of requests)assert.deepEqual(req.options,{count:'exact',head:true});
 assert.ok(requests.filter(r=>r.table==='music_news_comments').every(r=>r.filters.moderation_status==='visible'));
 assert.deepEqual(stories.map(s=>s.slug),['old','new','hidden']);
});
test('zero engagement is distinguishable from failure and empty editions make no queries',async()=>{
 const {mod,admin,requests}=setup({zero:true});
 assert.deepEqual(await mod.readNewsPopularity([],admin),{slugs:[],status:'empty'});assert.equal(requests.length,0);
 assert.deepEqual(await mod.readNewsPopularity(stories,admin),{slugs:['new','hidden','old'],status:'empty'});
});
for(const config of [{fail:true},{missing:true}])test(`incomplete counts discard partial ranking and fall back to latest: ${JSON.stringify(config)}`,async()=>{
 const {mod}=setup(config);
 assert.deepEqual(await mod.newsPopularity(),{slugs:['new','hidden','old'],status:'unavailable'});
});
