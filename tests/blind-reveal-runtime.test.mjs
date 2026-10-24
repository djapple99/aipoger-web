import test from 'node:test';
import assert from 'node:assert/strict';
import { mountMv, text } from './helpers/mv-runtime.mjs';
import { battleRetroCopy } from '../src/lib/battle-retro-copy.ts';
const work=side=>({side,id:'work-'+side,title:'Song '+side,artist:'Creator '+side,coverUrl:'/cover-'+side,audioUrl:'/full-'+side,href:'/ai-music?track=work-'+side+'#works'});
async function mount(t,{lang='zh',choice='A',failed=false,unavailable=false,readError=false,mv=false}={}) {
 const toggles=[],plays=[],reads=[];let retries=0,pauses=0,closed=0;
 const works=(choice==='tie'?['A','B']:[choice]).map(side=>unavailable?{side,unavailable:true}:{...work(side),videoId:mv?'aqz-KE-bpKQ':null});
 const hearts={hearts:{},ready:true,busyId:null,error:readError?'read':null,async toggle(id){toggles.push(id);return 'done';},async reload(){retries++;}};
 const props={result:failed?null:{choice,works},failed,loading:false,onRetry(){retries++;},onPause(){pauses++;},async onListen(w){plays.push(w);return true;}};
 const ui=await mountMv(t,'src/components/blind-listening-reveal.tsx',props,{
  'next/link':{__esModule:true,default:'a'},'lucide-react':Object.fromEntries(['Disc3','Heart','Pause','Play','Video'].map(k=>[k,()=>null])),
  './blind-work-comments':{__esModule:true,default:'comments-preview'},'./home-work-feedback':{__esModule:true,default:'work-feedback'},
  '@/lib/battle-retro-copy':{battleRetroCopy},'@/lib/i18n':{useI18n:()=>({lang})},
  '@/lib/use-mv-hearts':{useMvHearts(ids){reads.push(ids);return hearts;}},
  '@/lib/music-player-store':{musicPlayer:{toggle(){},close(){closed++;}},useMusicPlayer:()=>({session:null,playing:false})},
  './battle-retro.module.css':{__esModule:true,default:{}},
 });
 return {...ui,toggles,plays,reads,hearts,retries:()=>retries,pauses:()=>pauses,closed:()=>closed,buttons:label=>ui.nodes().filter(n=>n.type==='button'&&text(n)===label)};
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
test('selected comments invite opens the original song review without playing a video or another song',async t=>{
 const ui=await mount(t,{mv:true}),c=battleRetroCopy('zh');
 const preview=()=>ui.nodes().find(n=>n.type==='comments-preview').props;
 assert.equal(preview().trackId,'work-A');assert.equal(ui.nodes().some(n=>n.type==='work-feedback'),false);
 preview().onReview();await ui.flush();const modal=ui.nodes().find(n=>n.type==='work-feedback').props;
 assert.equal(modal.work.id,'work-A');assert.equal(modal.reviewSurface,'music');assert.equal(modal.showVideo,false);assert.equal(modal.autoPlay,false);assert.equal(modal.returnPath,'/battle/listen');
 assert.equal(ui.pauses(),1);assert.equal(ui.closed(),1);assert.deepEqual(ui.plays,[]);assert.deepEqual(ui.toggles,[]);
 const version=preview().version;modal.onChange();await ui.flush();assert.equal(preview().version,version+1);
 modal.onClose();await ui.flush();assert.equal(ui.nodes().some(n=>n.type==='work-feedback'),false);assert.ok(ui.text().includes('Song A'));assert.equal(ui.buttons(c.fullMv).length,1);
});
for(const lang of ['zh','en','ja','ko'])test('full MV '+lang+' appears only for a revealed MV and plays only after the explicit click',async t=>{
 const c=battleRetroCopy(lang),audio=await mount(t,{lang});assert.equal(audio.buttons(c.fullMv).length,0);
 const ui=await mount(t,{lang,mv:true,choice:'B'});assert.equal(ui.nodes().some(n=>n.type==='work-feedback'),false);
 ui.buttons(c.fullMv)[0].props.onClick();await ui.flush();const modal=ui.nodes().find(n=>n.type==='work-feedback').props;
 assert.equal(modal.work.id,'work-B');assert.equal(modal.work.videoId,'aqz-KE-bpKQ');assert.equal(modal.showVideo,true);assert.equal(modal.autoPlay,true);assert.equal(modal.reviewSurface,'mv');assert.equal(ui.pauses(),1);
});
