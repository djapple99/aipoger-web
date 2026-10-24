import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv, text } from './helpers/mv-runtime.mjs';
import { battleRetroCopy } from '../src/lib/battle-retro-copy.ts';
const work=side=>({side,id:'work-'+side,title:'Song '+side,artist:'Creator '+side,coverUrl:'/cover-'+side,audioUrl:'/full-'+side,href:'/ai-music?track=work-'+side+'#works'});
async function mount(t,{lang='zh',choice='A',failed=false,unavailable=false,readError=false}={}) {
 const toggles=[],plays=[],reads=[];let retries=0;
 const works=(choice==='tie'?['A','B']:[choice]).map(side=>unavailable?{side,unavailable:true}:work(side));
 const hearts={hearts:{},ready:true,busyId:null,error:readError?'read':null,async toggle(id){toggles.push(id);return 'done';},async reload(){retries++;}};
 const props={result:failed?null:{choice,works},failed,loading:false,onRetry(){retries++;},async onListen(w){plays.push(w);return true;}};
 const ui=await mountMv(t,'src/components/blind-listening-reveal.tsx',props,{
  'next/link':{__esModule:true,default:'a'},'lucide-react':Object.fromEntries(['Disc3','Heart','Pause','Play'].map(k=>[k,()=>null])),
  '@/lib/battle-retro-copy':{battleRetroCopy},'@/lib/i18n':{useI18n:()=>({lang})},
  '@/lib/use-mv-hearts':{useMvHearts(ids){reads.push(ids);return hearts;}},
  '@/lib/music-player-store':{musicPlayer:{toggle(){}},useMusicPlayer:()=>({session:null,playing:false})},
  './battle-retro.module.css':{__esModule:true,default:{}},
 });
 return {...ui,toggles,plays,reads,hearts,retries:()=>retries,buttons:label=>ui.nodes().filter(n=>n.type==='button'&&text(n)===label)};
}
for(const lang of ['zh','en','ja','ko'])test('revealed card '+lang+' offers explicit Heart and full play with the existing ID',async t=>{
 const ui=await mount(t,{lang}),c=battleRetroCopy(lang);assert.ok(ui.text().includes('Song A'));assert.ok(ui.text().includes('Creator A'));assert.equal(ui.text().includes('Song B'),false);
 assert.deepEqual(ui.toggles,[]);assert.deepEqual(ui.plays,[]);assert.deepEqual(ui.reads.at(-1),['work-A']);
 await ui.buttons(c.heart)[0].props.onClick();assert.deepEqual(ui.toggles,['work-A']);
 await ui.buttons(c.fullSong)[0].props.onClick();await ui.flush();assert.equal(ui.plays[0].id,'work-A');
 const link=ui.nodes().find(n=>n.type==='a'&&text(n)==='Song A');assert.equal(link.props.href,'/ai-music?lang='+lang+'&track=work-A#works');
});
test('tie gives two independently actionable cards',async t=>{
 const ui=await mount(t,{choice:'tie'}),c=battleRetroCopy('zh');assert.equal(ui.buttons(c.heart).length,2);assert.equal(ui.buttons(c.fullSong).length,2);
 await ui.buttons(c.heart)[1].props.onClick();await ui.buttons(c.fullSong)[0].props.onClick();assert.deepEqual(ui.toggles,['work-B']);assert.equal(ui.plays[0].id,'work-A');
});
test('unavailable and failed reveals expose no identity or playable media',async t=>{
 const c=battleRetroCopy('zh');for(const options of [{unavailable:true},{failed:true}]){
  const ui=await mount(t,options);assert.equal(ui.text().includes('Song A'),false);assert.equal(ui.buttons(c.heart).length,0);assert.equal(ui.buttons(c.fullSong).length,0);assert.deepEqual(ui.reads.at(-1),[]);
  if(options.failed){ui.buttons(c.retry)[0].props.onClick();assert.equal(ui.retries(),1);}
 }
});
test('Heart read failure disables toggling and allows a read-only retry',async t=>{
 const ui=await mount(t,{readError:true}),c=battleRetroCopy('zh');assert.equal(ui.buttons(c.heart)[0].props.disabled,true);assert.ok(ui.text().includes(c.heartFailed));
 ui.buttons(c.retry)[0].props.onClick();assert.equal(ui.retries(),1);assert.deepEqual(ui.toggles,[]);
});
