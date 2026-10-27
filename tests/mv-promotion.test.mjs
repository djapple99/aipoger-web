import test from 'node:test';
import assert from 'node:assert/strict';
import { HALLOWEEN_MV_PROMOTION as campaign, activeMvPromotion, homeDiscoveryCacheControl } from '../src/lib/mv-promotion.ts';
import { buildHomeDiscovery } from '../src/lib/home-discovery.ts';
import { buildMvDiscovery } from '../src/lib/mv-discovery.ts';

const row = (id, extra={}) => ({id, title:id, artist:'Creator', genre:'EDM 百大電音', source:'community', review_status:'approved', is_active:true, created_by:`author-${id}`, created_at:'2026-10-27T06:36:37Z', audio_path:`${id}.mp3`, youtube_url:'https://youtu.be/0NlXuljHn0I', ...extra});
const media = (bucket,path) => path ? `https://media.example/${bucket}/${path}` : '';
const pin = row(campaign.workId);
const newer = row('newer', {created_at:'2026-10-28T00:00:00Z'});
const supported = row('supported', {created_at:'2026-10-26T00:00:00Z'});
const rows = [pin,newer,supported,row('another',{created_at:'2026-10-25T00:00:00Z'})];
const hearts = [{track_id:'supported',user_id:'listener',vote_date:'2026-10-28',reaction:'heart'}];

test('Halloween work remains homepage lead through every rotation despite newer or supported works',()=>{
 for(let t=Date.parse('2026-10-28T00:00:00Z');t<Date.parse(campaign.endsAt);t+=4*3600000){
  const home=buildHomeDiscovery(rows,hearts,media,new Date(t));
  assert.equal(home.featured[0].id,campaign.workId);
  assert.equal(home.featured[0].discoveryReason,'seasonal');
  assert.ok(home.featured.length<=4);
  assert.equal(new Set(home.featured.map(w=>w.id)).size,home.featured.length);
  assert.ok(home.singles.every(w=>!home.featured.some(f=>f.id===w.id)));
  const mv=buildMvDiscovery(rows,hearts,media,new Date(t));
  assert.equal(mv.promotion.work.id,campaign.workId);
  assert.equal(mv.featured[0].id,'supported'); // Editorial promotion never falsifies weekly support.
  assert.equal(mv.works.length,4);
 }
});

test('Taipei Nov 1 midnight ends both exceptions without altering publication or normal selection',()=>{
 assert.ok(activeMvPromotion([{id:campaign.workId,videoId:'0NlXuljHn0I'}],new Date('2026-10-31T15:59:59.999Z')));
 for(const value of ['2026-10-31T16:00:00Z','2026-11-02T01:00:00Z','2027-10-31T12:00:00Z','2026-10-26T15:59:59Z']){
  const now=new Date(value);
  assert.equal(buildMvDiscovery(rows,hearts,media,now).promotion,null);
  const actual=buildHomeDiscovery(rows,hearts,media,now);
  const normal=buildHomeDiscovery(rows.map(r=>r.id===campaign.workId?{...r,id:'normal-id'}:r),hearts,media,now);
  const ids=items=>items.map(w=>w.id===campaign.workId?'normal-id':w.id);
  assert.deepEqual(ids(actual.featured),ids(normal.featured));
  assert.ok(actual.featured.every(w=>w.discoveryReason!=='seasonal'));
 }
 assert.equal(pin.created_at,'2026-10-27T06:36:37Z');
 assert.equal(homeDiscoveryCacheControl(new Date('2026-10-31T15:59:30Z')),'no-store');
});

test('promotion bypasses age for exposure but never republishes hidden, removed, pending, missing or non-MV works',()=>{
 const now=new Date('2026-10-30T00:00:00Z');
 assert.equal(buildHomeDiscovery([row(campaign.workId,{created_at:'2026-06-01T00:00:00Z'}),newer],[],media,now).featured[0].id,campaign.workId);
 for(const extra of [{hidden_at:'2026-10-29'}, {removed_at:'2026-10-29'}, {review_status:'pending'}, {is_active:false}, {youtube_url:null}, {work_kind:'album'}]){
  const source=[row(campaign.workId,extra),newer];
  assert.equal(buildMvDiscovery(source,[],media,now).promotion,null);
  assert.ok(buildHomeDiscovery(source,[],media,now).featured.every(w=>w.discoveryReason!=='seasonal'));
 }
 assert.equal(buildMvDiscovery([newer],[],media,now).promotion,null);
});
