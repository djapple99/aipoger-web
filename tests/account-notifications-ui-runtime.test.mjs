import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv } from './helpers/mv-runtime.mjs';
import { loadTs } from './helpers/choice-runtime.mjs';
async function mount(t, fail=false) {
  const win=new EventTarget(),doc=new EventTarget();win.location={hash:''};doc.visibilityState='visible';
  const calls=[],timers=new Map();let callback,serial=0;
  const row={id:'notice-1',title:'Alice commented on your song',body:'A clear, detailed review of this work.',type:'listen_bar_track_comment',read_at:null,created_at:'2026-10-15T10:00:00Z',metadata:{href:'/mv?track=1'}};
  const ui=await mountMv(t,'src/components/account-notifications.tsx',{userId:'owner'},{
    'next/link':{default:'a'},'lucide-react':Object.fromEntries(['Bell','ChevronDown','ArrowUpRight','Check'].map(k=>[k,k])),
    '@/lib/i18n':{useI18n:()=>({lang:'en'})},'@/lib/creator-center-copy':{creatorText:(_lang,_zh,en)=>en},
    '@/lib/use-account-notices':{useAccountNotices:()=>1},'@/lib/account-notifications':loadTs('src/lib/account-notifications.ts'),
    './account-notifications.module.css':{default:new Proxy({},{get:(_t,k)=>k})},
    '@/lib/account-notifications-client':{accountNoticeRequest:async(_id,query,ids)=>{calls.push({query,ids});if(ids){if(fail)throw Error('offline');return{readAt:'2026-10-15T11:00:00Z',readIds:ids}}return{notices:[row],hasMore:false}}}
  },{window:win,document:doc,IntersectionObserver:class{constructor(fn){callback=fn}observe(){}disconnect(){}},setTimeout:fn=>{timers.set(++serial,fn);return serial},clearTimeout:id=>timers.delete(id)});
  ui.refs.find(r=>r?.current===null).current={scrollIntoView(){},querySelectorAll:()=>[{dataset:{noticeId:row.id}}]};
  return{ui,calls,doc,see(){callback([{target:{dataset:{noticeId:row.id}},isIntersecting:true}])},async elapse(){const list=[...timers.values()];timers.clear();list.forEach(fn=>fn());await ui.flush()},async open(){ui.nodes().find(n=>n.props?.['aria-controls']==='notification-list').props.onClick();await ui.flush()}};
}
test('collapsed, offscreen and background notifications are not marked read; visible messages persist without discarding history',async t=>{
  const x=await mount(t);assert.equal(x.calls.length,0);await x.open();assert.equal(x.calls.filter(c=>c.ids).length,0);assert.match(x.ui.text(),/Alice/);
  x.doc.visibilityState='hidden';x.see();await x.elapse();assert.equal(x.calls.filter(c=>c.ids).length,0);
  x.doc.visibilityState='visible';x.doc.dispatchEvent(new Event('visibilitychange'));await x.elapse();assert.deepEqual(x.calls.filter(c=>c.ids).map(c=>c.ids),[['notice-1']]);
  assert.match(x.ui.text(),/A clear, detailed review/);assert.equal(x.ui.nodes().find(n=>n.type==='article').props['data-unread'],false);
});
test('failed read persistence retains unread status and offers a retry',async t=>{
  const x=await mount(t,true);await x.open();x.see();await x.elapse();assert.equal(x.ui.nodes().find(n=>n.type==='article').props['data-unread'],true);assert.match(x.ui.text(),/Read status was not saved/);assert.ok(x.ui.nodes().some(n=>n.type==='button'&&n.props.children==='Retry'));
});
