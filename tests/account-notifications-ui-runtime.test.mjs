import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv } from './helpers/mv-runtime.mjs';
import { loadTs } from './helpers/choice-runtime.mjs';
async function mount(t, {search='',hidden=false,failRead=false,newArrival=false,initialRows}={}) {
  const win=new EventTarget(),doc=new EventTarget();win.location={hash:'',search};doc.visibilityState=hidden?'hidden':'visible';
  const calls=[];let fail=false,readFailure=failRead;
  const through='2026-10-25T06:00:00.000Z';
  let rows=initialRows??Array.from({length:7},(_,i)=>({id:'notice-'+(i+1),title:'Comment '+(i+1),body:'Full review '+(i+1),type:'listen_bar_track_comment',read_at:null,kept_at:null,created_at:'2026-10-15T10:00:00.000Z',expires_at:'2099-01-01T00:00:00.000Z',metadata:{href:'/mv?track='+i}}));
  const ui=await mountMv(t,'src/components/account-notifications.tsx',{userId:'owner'},{
    'next/link':{default:'a'},'lucide-react':Object.fromEntries(['Bell','ChevronDown','ChevronLeft','ChevronRight','ArrowUpRight','Check','Bookmark','Trash2','MoreVertical','ListFilter'].map(k=>[k,k])),
    '@/lib/i18n':{useI18n:()=>({lang:'en'})},'@/lib/creator-center-copy':{creatorText:(_lang,_zh,en)=>en},
    '@/lib/use-account-notices':{useAccountNotices:()=>rows.filter(r=>!r.read_at).length},'@/lib/account-notifications':loadTs('src/lib/account-notifications.ts'),
    './account-notifications.module.css':{default:new Proxy({},{get:(_t,k)=>k})},
    '@/lib/account-notifications-client':{
      readAccountNoticeInbox:async(_id,readThrough)=>{
        calls.push({action:'read_inbox',readThrough});if(readFailure)throw Error('offline');
        if(newArrival){rows.push({...rows[0],id:'later',title:'Later arrival',created_at:'2026-10-25T06:00:01.000Z',read_at:null});newArrival=false;}
        rows.filter(r=>!r.read_at&&r.created_at<=readThrough).forEach(r=>r.read_at=through);
        return {readThrough,readAt:through,unreadCount:rows.filter(r=>!r.read_at).length};
      },
      accountNoticeRequest:async(_id,query,ids,action)=>{
        calls.push({query,ids,action});if(ids){if(fail)throw Error('offline');const row=rows.find(r=>r.id===ids[0]);
          if(action==='delete')rows=rows.filter(r=>!ids.includes(r.id));
          if(action==='read')row.read_at=through;
          if(action==='keep')row.kept_at=through;
          if(action==='unkeep')row.kept_at=null;
          return {ids,readAt:row?.read_at,keptAt:row?.kept_at};
        }
        const p=new URLSearchParams(query),page=Number(p.get('page')),filter=p.get('filter');
        const selected=rows.filter(r=>filter==='unread'?!r.read_at:filter==='kept'?r.kept_at:true);
        return {notices:structuredClone(selected.slice(page*3,page*3+3)),total:selected.length,readThrough:through};
      }
    }
  },{window:win,document:doc});
  ui.refs.find(r=>r?.current===null).current={scrollIntoView(){},querySelector:()=>null};
  const click=async label=>{ui.nodes().find(n=>n.type==='button'&&n.props['aria-label']===label).props.onClick();await ui.flush()};
  return {ui,calls,win,doc,get rows(){return rows},set fail(v){fail=v},set failRead(v){readFailure=v},click,async toggle(){ui.nodes().find(n=>n.props?.['aria-controls']==='notification-list').props.onClick();await ui.flush()},async expand(id){ui.nodes().find(n=>n.props?.['aria-controls']==='notice-'+id).props.onClick();await ui.flush()}};
}
test('entering Creator Center opens three summaries and acknowledges the full existing inbox without handling each notice',async t=>{
 const x=await mount(t);assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.doesNotMatch(x.ui.text(),/Full review/);
 assert.equal(x.rows.filter(r=>!r.read_at).length,0);assert.equal(x.rows.length,7);assert.ok(x.ui.nodes().filter(n=>n.type==='article').every(n=>n.props['data-unread']===false));
 await x.expand('notice-1');assert.match(x.ui.text(),/Full review 1/);assert.equal(x.calls.filter(c=>c.ids).length,0);
 await x.expand('notice-2');assert.doesNotMatch(x.ui.text(),/Full review 1/);assert.match(x.ui.text(),/Full review 2/);
 await x.click('Next notifications');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.match(x.ui.text(),/Comment 4/);
 const again=await mount(t,{initialRows:structuredClone(x.rows)});assert.equal(again.rows.filter(r=>!r.read_at).length,0);
});
test('keeping and deleting remain independent; deletion fills the last page without requiring a reply',async t=>{
 const x=await mount(t);await x.click('Keep notification：Comment 1');assert.doesNotMatch(x.ui.text(),/Full review/);assert.ok(x.ui.nodes().some(n=>n.props?.['aria-label']==='Stop keeping：Comment 1'));
 await x.click('Next notifications');await x.click('Next notifications');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,1);
 await x.click('Delete notification：Comment 7');assert.equal(x.ui.nodes().filter(n=>n.type==='article').length,3);assert.match(x.ui.text(),/Comment 4/);assert.doesNotMatch(x.ui.text(),/Comment 7/);
});
test('failed inbox acknowledgement retains unread state and offers a persistent retry',async t=>{
 const x=await mount(t,{failRead:true});assert.equal(x.rows.filter(r=>!r.read_at).length,7);assert.match(x.ui.text(),/Read status was not saved/);assert.equal(x.ui.nodes().find(n=>n.type==='article').props['data-unread'],true);
 x.failRead=false;x.ui.nodes().find(n=>n.type==='button'&&n.props.children==='Retry').props.onClick();await x.ui.flush();assert.equal(x.rows.filter(r=>!r.read_at).length,0);assert.doesNotMatch(x.ui.text(),/Read status was not saved/);
});
test('background visits do not acknowledge; visibility and inbox reopen do, with new arrivals after the snapshot still unread',async t=>{
 const x=await mount(t,{hidden:true,newArrival:true});assert.equal(x.calls.filter(c=>c.action==='read_inbox').length,0);assert.equal(x.rows.filter(r=>!r.read_at).length,7);
 x.doc.visibilityState='visible';x.doc.dispatchEvent(new Event('visibilitychange'));await x.ui.flush();assert.deepEqual(x.rows.filter(r=>!r.read_at).map(r=>r.id),['later']);
 await x.toggle();const before=x.calls.length;x.win.dispatchEvent(new Event('aipoger:open-notifications'));await x.ui.flush();assert.ok(x.calls.length>before);assert.match(x.ui.text(),/Comment 1/);
});
test('cross-page notification query opens and acknowledges without a separate bell or detail click',async t=>{
 const x=await mount(t,{search:'?lang=zh&tab=notifications'});assert.match(x.ui.text(),/Comment 1/);assert.equal(x.rows.filter(r=>!r.read_at).length,0);
});
test('failed ordinary mutations still retain their state and retry only the intended notice',async t=>{
 const x=await mount(t);x.fail=true;await x.click('Keep notification：Comment 1');assert.match(x.ui.text(),/Change was not saved/);assert.equal(x.rows[0].kept_at,null);
 x.fail=false;x.ui.nodes().find(n=>n.type==='button'&&n.props.children==='Retry').props.onClick();await x.ui.flush();assert.ok(x.rows[0].kept_at);
});
