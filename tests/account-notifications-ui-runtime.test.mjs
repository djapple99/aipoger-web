import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv } from './helpers/mv-runtime.mjs';
import { loadTs } from './helpers/choice-runtime.mjs';
async function mount(t, search='') {
  const win=new EventTarget(),doc=new EventTarget();win.location={hash:'',search};
  const calls=[];let fail=false;
  let rows=Array.from({length:7},(_,i)=>({id:'notice-'+(i+1),title:'Comment '+(i+1),body:'Full review '+(i+1),type:'listen_bar_track_comment',read_at:null,kept_at:null,created_at:'2026-10-15T10:00:00Z',expires_at:'2099-01-01T00:00:00Z',metadata:{href:'/mv?track='+i}}));
  const ui=await mountMv(t,'src/components/account-notifications.tsx',{userId:'owner'},{
    'next/link':{default:'a'},'lucide-react':Object.fromEntries(['Bell','ChevronDown','ChevronLeft','ChevronRight','ArrowUpRight','Check','Bookmark','Trash2','MoreVertical','ListFilter'].map(k=>[k,k])),
    '@/lib/i18n':{useI18n:()=>({lang:'en'})},'@/lib/creator-center-copy':{creatorText:(_lang,_zh,en)=>en},
    '@/lib/use-account-notices':{useAccountNotices:()=>rows.filter(r=>!r.read_at).length},'@/lib/account-notifications':loadTs('src/lib/account-notifications.ts'),
    './account-notifications.module.css':{default:new Proxy({},{get:(_t,k)=>k})},
    '@/lib/account-notifications-client':{accountNoticeRequest:async(_id,query,ids,action)=>{
      calls.push({query,ids,action});if(ids){if(fail)throw Error('offline');const row=rows.find(r=>r.id===ids[0]);
        if(action==='delete')rows=rows.filter(r=>!ids.includes(r.id));
        if(action==='read')row.read_at='2026-10-15T11:00:00Z';
        if(action==='keep')row.kept_at='2026-10-15T11:00:00Z';
        if(action==='unkeep')row.kept_at=null;
        return {ids,readAt:row?.read_at,keptAt:row?.kept_at};
      }
      const p=new URLSearchParams(query),page=Number(p.get('page')),filter=p.get('filter');
      const selected=rows.filter(r=>filter==='unread'?!r.read_at:filter==='kept'?r.kept_at:true);
      return {notices:structuredClone(selected.slice(page*3,page*3+3)),total:selected.length};
    }}
  },{window:win,document:doc});
  ui.refs.find(r=>r?.current===null).current={scrollIntoView(){},querySelector:()=>null};
  const click=async label=>{ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']===label).props.onClick();await ui.flush()};
  return {ui,calls,win,set fail(v){fail=v},click,async open(){ui.nodes().find(n=>n.props?.['aria-controls']==='notification-list').props.onClick();await ui.flush()},async expand(id){ui.nodes().find(n=>n.props?.['aria-controls']==='notice-'+id).props.onClick();await ui.flush()}};
}
test('three summary rows; opening inbox does not mark read, clicking only one detail does',async t=>{
 const x=await mount(t);assert.equal(x.calls.length,0);await x.open();assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.doesNotMatch(x.ui.text(),/Full review/);assert.equal(x.calls.filter(c=>c.ids).length,0);
 await x.expand('notice-1');assert.match(x.ui.text(),/Full review 1/);assert.deepEqual(x.calls.filter(c=>c.ids).map(c=>c.ids),[['notice-1']]);
 await x.expand('notice-2');assert.doesNotMatch(x.ui.text(),/Full review 1/);assert.match(x.ui.text(),/Full review 2/);
 await x.click('Next notifications');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.match(x.ui.text(),/Comment 4/);assert.doesNotMatch(x.ui.text(),/Comment 1/);assert.equal(x.calls.filter(c=>c.ids).length,2);
 await x.click('Previous notifications');assert.equal(x.ui.nodes().filter(n=>n.type==='article')[0].props['data-unread'],false);
});
test('keep does not open or mark read; deletion fills page and the last empty page steps back',async t=>{
 const x=await mount(t);await x.open();await x.click('Keep notification：Comment 1');assert.doesNotMatch(x.ui.text(),/Full review/);assert.equal(x.ui.nodes().filter(n=>n.type==='article')[0].props['data-unread'],true);
 assert.ok(x.ui.nodes().some(n=>n.props?.['aria-label']==='Stop keeping：Comment 1'));
 await x.click('Next notifications');await x.click('Next notifications');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,1);
 await x.click('Delete notification：Comment 7');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.match(x.ui.text(),/Comment 4/);assert.doesNotMatch(x.ui.text(),/Comment 7/);
});
test('failed mutation retains real state and retry persists only that notification',async t=>{
 const x=await mount(t);await x.open();x.fail=true;await x.expand('notice-1');assert.equal(x.ui.nodes().find(n=>n.type==='article').props['data-unread'],true);assert.match(x.ui.text(),/Change was not saved/);
 x.fail=false;x.ui.nodes().find(n=>n.type==='button'&&n.props.children==='Retry').props.onClick();await x.ui.flush();assert.equal(x.ui.nodes().find(n=>n.type==='article').props['data-unread'],false);
});
test('same-page event and cross-page query open the compact inbox without acknowledging notices',async t=>{
 const x=await mount(t);x.win.dispatchEvent(new Event('aipoger:open-notifications'));await x.ui.flush();assert.match(x.ui.text(),/Comment 1/);assert.equal(x.calls.filter(c=>c.ids).length,0);
 const y=await mount(t,'?lang=zh&tab=notifications');assert.match(y.ui.text(),/Comment 1/);assert.equal(y.calls.filter(c=>c.ids).length,0);
});
