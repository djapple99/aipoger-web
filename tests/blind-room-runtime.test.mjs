import test from "node:test";
import assert from "node:assert/strict";
import { mountMv, text } from "./helpers/mv-runtime.mjs";
import { battleRetroCopy } from "../src/lib/battle-retro-copy.ts";
import { BLIND_END, BLIND_MIN_SECONDS, BLIND_START } from "../src/lib/blind-listening.ts";
async function mount(t,{lang="zh",guest=false,failVote=false,nextFails=false,revealFails=false,lagTicks=false,lagPlay=false}={}) {
 let session=guest?null:{access_token:"test",user:{id:"reader"}},authChanged,clock=0,active=null,last=15,counter=0;
 const releases=[];const calls=[],playerCalls=[],heard={A:0,B:0};let lastReveal;
 const work=side=>({id:"work-"+side,side,title:"Hidden title "+side,artist:"Hidden creator "+side,audioUrl:"/full-"+side,coverUrl:"/cover-"+side,href:"/ai-music?track=work-"+side+"#works"});
 const question=()=>({id:session.user.id+"-q"+counter,audioA:"/anonymous-a-"+session.user.id+counter,audioB:"/anonymous-b-"+session.user.id+counter,heardA:0,heardB:0,expiresAt:"2099-01-01"});
 const icons=Object.fromEntries(["ArrowLeft","Equal","Heart","Pause","Play","RotateCcw"].map(k=>[k,()=>null]));
 const ui=await mountMv(t,"src/components/blind-listening-room.tsx",{},{
   "next/link":{__esModule:true,default:"a"},
   "lucide-react":icons,"./editorial-header":{__esModule:true,default:()=>null},
   "./blind-listening-reveal":{__esModule:true,default:"reveal-view"},
   "@/lib/i18n":{useI18n:()=>({lang})},"@/lib/battle-retro-copy":{battleRetroCopy},
   "@/lib/blind-listening":{BLIND_END,BLIND_MIN_SECONDS,BLIND_START},"./battle-retro.module.css":{__esModule:true,default:{}},
   "@/lib/music-player-store":{musicPlayer:{close(){playerCalls.push({action:"close"});},async start(...args){playerCalls.push({action:"start",args});return true;}}},
   "@/lib/supabase":{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){authChanged=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
 },{performance:{now:()=>clock},fetch:async(url,init={})=>{
   const body=init.body?JSON.parse(init.body):null;calls.push(body);
   if(!body)return {ok:true,json:async()=>({question:question()})};
   if(body.action==="tick"){
     if(body.event!=="seek"&&active===body.side)heard[body.side]=Math.min(30,heard[body.side]+Math.max(0,body.position-last));
     if(body.event!=="seek"||active===body.side)last=body.position;if(body.event!=="seek")active=body.event==="pause"?null:body.side;
     if((lagTicks&&body.event!=="play")||(lagPlay&&body.event==="play"))await new Promise(resolve=>releases.push(resolve));
     return {ok:true,json:async()=>({heardA:heard.A,heardB:heard.B})};
   }
   if(body.action==="prepare")return {ok:true,json:async()=>({prepared:true})};
   if(body.action==="reveal")return {ok:true,json:async()=>lastReveal};
   if(failVote)return {ok:false,json:async()=>({error:"SAVE_FAILED"})};
   lastReveal={choice:body.choice,works:(body.choice==="tie"?["A","B"]:[body.choice]).map(work)};
   counter++;heard.A=heard.B=0;active=null;
   return {ok:true,json:async()=>({choice:body.choice,awarded:3,balance:3,nextQuestion:nextFails?null:question(),nextError:nextFails,reveal:revealFails?null:lastReveal,revealError:revealFails})};
 }});
 const audioProps=side=>ui.nodes().find(n=>n.type==="audio"&&n.props["data-side"]===side).props;
 const els=Object.fromEntries(["A","B"].map(side=>[side,{src:"",currentTime:0,duration:120,readyState:4,paused:true,
   load(){this.currentTime=0;},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},removeAttribute(){this.src="";},getAttribute(){return this.src;}}]));
 for(const side of ["A","B"])audioProps(side).ref.current=els[side];
 const sync=()=>{for(const side of ["A","B"]){const el=els[side],src=audioProps(side).src??"";if(el.src!==src){el.src=src;if(src)audioProps(side).onLoadedMetadata();}}};
 sync();await ui.flush();
 const button=s=>ui.nodes().find(n=>n.type==="button"&&text(n).trim()===s)?.props;
 async function listen(side,until=8){
   sync();button(battleRetroCopy(lang).play+" "+side).onClick();await ui.flush();
   const from=els[side].currentTime-15;
   for(let s=from;s<until;){s=Math.min(until,s+1);clock+=1100;els[side].currentTime=15+s;audioProps(side).onTimeUpdate();await ui.flush();}
   if(until<30){button(battleRetroCopy(lang).pause+" "+side).onClick();await ui.flush();}
 }
 return {...ui,button,listen,calls,playerCalls,els,audioProps,sync,reveal:()=>ui.nodes().find(n=>n.type==="reveal-view")?.props,advance(seconds){clock+=seconds*1000;},releaseTick(){releases.shift()?.();},async switchUser(id){session={access_token:"new",user:{id}};heard.A=heard.B=0;authChanged("SIGNED_IN",session);await ui.flush();sync();}};
}
for(const lang of ["zh","en","ja","ko"])test("blind room "+lang+" requires eight seconds on both sides then automatically advances",async t=>{
 const ui=await mount(t,{lang}),c=battleRetroCopy(lang);
 assert.ok(ui.text().includes(c.listenFirst));assert.equal(ui.button(c.tie).disabled,true);
 assert.equal(ui.audioProps("A").preload,"auto");assert.ok(ui.audioProps("B").src,"B is prepared before clicking play");
 assert.equal(ui.button(c.next),undefined);assert.ok(ui.nodes().some(n=>n.type==="a"&&text(n)===c.exit));
 await ui.listen("A",7.9);await ui.listen("B",8);assert.equal(ui.button(c.tie).disabled,true);
 await ui.button(c.tie).onClick();await ui.flush();assert.equal(ui.calls.filter(x=>x?.action==="vote").length,0);
 await ui.listen("A",8);assert.equal(ui.button(c.tie).disabled,false);
 await ui.button(c.tie).onClick();await ui.flush();ui.sync();
 assert.ok(ui.text().includes(c.awarded));assert.equal(ui.button(c.tie).disabled,true);
 assert.match(ui.audioProps("A").src,/reader1$/);assert.equal(ui.els.A.paused,true);assert.equal(ui.els.B.paused,true);
 const votes=ui.calls.filter(x=>x?.action==="vote");assert.equal(votes.length,1);assert.equal(votes[0].choice,"tie");
 assert.equal(ui.calls.filter(x=>x===null).length,1,"next pair must arrive in the vote response, without another GET");
});
test("thirty-second cutoff remains and A/B audio never plays simultaneously",async t=>{
 const ui=await mount(t),c=battleRetroCopy("zh");
 ui.button(c.play+" A").onClick();await ui.flush();ui.button(c.play+" B").onClick();await ui.flush();
 assert.equal(ui.els.A.paused,true);assert.equal(ui.els.B.paused,false);
 ui.button(c.pause+" B").onClick();await ui.flush();await ui.listen("A",30);
 assert.equal(ui.els.A.currentTime,45);assert.equal(ui.els.A.paused,true);
 const before=ui.calls.length;ui.audioProps("A").onTimeUpdate();await ui.flush();assert.equal(ui.calls.length,before);
});
test("retry preserves A preference and does not invent a tie",async t=>{
 const ui=await mount(t,{failVote:true}),c=battleRetroCopy("zh");
 await ui.listen("A");await ui.listen("B");await ui.button(c.prefer+" A").onClick();await ui.flush();
 assert.ok(ui.text().includes(c.saveFailed));await ui.button(c.retry).onClick();await ui.flush();
 assert.deepEqual(ui.calls.filter(x=>x?.action==="vote").map(x=>x.choice),["A","A"]);
});
test("next-pair failure keeps earned Credit and retries loading rather than voting",async t=>{
 const ui=await mount(t,{nextFails:true}),c=battleRetroCopy("zh");
 await ui.listen("A");await ui.listen("B");await ui.button(c.prefer+" B").onClick();await ui.flush();
 assert.ok(ui.text().includes(c.awarded));assert.ok(ui.text().includes(c.loadFailed));
 await ui.button(c.retry).onClick();await ui.flush();
 assert.equal(ui.calls.filter(x=>x?.action==="vote").length,1);assert.equal(ui.calls.filter(x=>x===null).length,2);
});
test("guest can leave at any time but cannot vote or play",async t=>{
 const ui=await mount(t,{guest:true}),c=battleRetroCopy("zh");
 assert.equal(ui.button(c.play+" A").disabled,true);assert.equal(ui.button(c.tie).disabled,true);
 const link=ui.nodes().find(n=>n.type==="a"&&text(n)===c.login);assert.ok(link.props.href.includes(encodeURIComponent("/battle/listen?lang=zh")));
 const exit=ui.nodes().find(n=>n.type==="a"&&text(n)===c.exit);assert.equal(exit.props.href,"/battle?lang=zh");assert.equal(ui.calls.length,0);
});
test("leave stops both sources without voting; switching accounts clears the last reward",async t=>{
 const ui=await mount(t),c=battleRetroCopy("zh");await ui.listen("A");
 const exit=ui.nodes().find(n=>n.type==="a"&&text(n)===c.exit);exit.props.onClick();await ui.flush();
 assert.equal(ui.els.A.src,"");assert.equal(ui.els.B.src,"");assert.equal(ui.calls.filter(x=>x?.action==="vote").length,0);
 await ui.switchUser("other");assert.equal(ui.text().includes(c.awarded),false);assert.match(ui.audioProps("A").src,/other0$/);assert.equal(ui.button(c.tie).disabled,true);
});

test("eight real seconds unlock seeking and the voting HUD without waiting for telemetry replies",async t=>{
 const ui=await mount(t,{lagTicks:true}),c=battleRetroCopy("zh");
 assert.ok(ui.text().includes(c.hudReady));
 let seek=()=>ui.nodes().find(n=>n.type==="input"&&n.props["aria-label"]===c.seek+" A").props;
 assert.equal(seek().disabled,true);seek().onChange({target:{value:"29"}});assert.equal(ui.els.A.currentTime,15);
 ui.button(c.play+" A").onClick();await ui.flush();assert.ok(ui.text().includes(c.hudListening));
 for(let sec=1;sec<=8;sec++){ui.advance(1);ui.els.A.currentTime=15+sec;ui.audioProps("A").onTimeUpdate();await ui.flush();}
 assert.equal(seek().disabled,false,"do not wait for the queued 2-second heartbeat response");
 assert.equal(ui.button(c.tie).disabled,true,"B still needs eight seconds");
 // Seeking is no substitute for hearing B, and emits an explicit no-credit event.
 seek().onChange({target:{value:"2"}});await ui.flush();assert.equal(ui.els.A.currentTime,17);assert.equal(ui.button(c.tie).disabled,true);
 for(let n=0;n<8;n++){ui.releaseTick();await ui.flush();}
 assert.ok(ui.calls.some(x=>x?.event==="seek"&&x.position===17));
 ui.button(c.play+" B").onClick();await ui.flush();ui.releaseTick();await ui.flush();
 for(let sec=1;sec<=8;sec++){ui.advance(1);ui.els.B.currentTime=15+sec;ui.audioProps("B").onTimeUpdate();await ui.flush();}
 assert.equal(ui.button(c.tie).disabled,false);assert.ok(ui.text().includes(c.hudVote));
});
test("a forged forward jump before eight seconds cannot unlock voting or seeking",async t=>{
 const ui=await mount(t),c=battleRetroCopy("zh");ui.button(c.play+" A").onClick();await ui.flush();
 ui.advance(.1);ui.els.A.currentTime=44;ui.audioProps("A").onTimeUpdate();await ui.flush();
 assert.equal(ui.nodes().find(n=>n.type==="input"&&n.props["aria-label"]===c.seek+" A").props.disabled,true);
 assert.equal(ui.button(c.tie).disabled,true);
});

test("pending clock acknowledgement primes media permission but does not play or count waiting",async t=>{
 const ui=await mount(t,{lagPlay:true}),c=battleRetroCopy("zh");
 ui.button(c.play+" A").onClick();await ui.flush();assert.equal(ui.els.A.paused,true);assert.ok(ui.text().includes(c.hudBuffering));
 ui.advance(12);ui.audioProps("A").onTimeUpdate();await ui.flush();assert.equal(ui.button(c.tie).disabled,true);
 assert.equal(ui.nodes().find(n=>n.type==="input"&&n.props["aria-label"]===c.seek+" A").props.disabled,true);
 ui.releaseTick();await ui.flush();assert.equal(ui.els.A.paused,false);assert.ok(ui.text().includes(c.hudListening));
});

for(const choice of ['A','B','tie'])test('room reveals only the selected '+choice+' after success and clears on account change',async t=>{
 const ui=await mount(t),c=battleRetroCopy('zh');assert.equal(ui.reveal(),undefined);
 await ui.listen('A');await ui.listen('B');await ui.button(choice==='tie'?c.tie:c.prefer+' '+choice).onClick();await ui.flush();ui.sync();
 assert.deepEqual(ui.reveal().result.works.map(w=>w.side),choice==='tie'?['A','B']:[choice]);
 assert.equal(ui.calls.some(x=>x?.reaction),false,'voting never automatically sends a Heart');
 await ui.switchUser('other');assert.equal(ui.reveal(),undefined);
});
test('reveal retry only fetches the committed result and keeps the next blind round',async t=>{
 const ui=await mount(t,{revealFails:true}),c=battleRetroCopy('zh');
 await ui.listen('A');await ui.listen('B');await ui.button(c.prefer+' A').onClick();await ui.flush();ui.sync();
 assert.equal(ui.reveal().failed,true);assert.ok(ui.text().includes(c.awarded));
 const next=ui.audioProps('A').src;ui.reveal().onRetry();await ui.flush();
 assert.equal(ui.reveal().failed,false);assert.equal(ui.audioProps('A').src,next);
 assert.equal(ui.calls.filter(x=>x?.action==='vote').length,1);assert.equal(ui.calls.filter(x=>x?.action==='reveal').length,1);
});
test('full-song listening pauses the next blind clip, preserves heard progress and resuming closes the shared player',async t=>{
 const ui=await mount(t),c=battleRetroCopy('zh');await ui.listen('A');await ui.listen('B');await ui.button(c.prefer+' B').onClick();await ui.flush();ui.sync();
 await ui.listen('A',4);ui.button(c.play+' A').onClick();await ui.flush();assert.equal(ui.els.A.paused,false);
 const before=ui.audioProps('A').src;assert.equal(await ui.reveal().onListen(ui.reveal().result.works[0]),true);await ui.flush();
 assert.equal(ui.els.A.paused,true);assert.equal(ui.els.B.paused,true);assert.equal(ui.audioProps('A').src,before);
 const start=ui.playerCalls.find(x=>x.action==='start');assert.equal(start.args[0][0].id,'work-B');assert.equal(start.args[0][0].heartTrackId,'work-B');assert.equal(start.args[3].repeat,false);
 ui.advance(60);ui.audioProps('A').onTimeUpdate();await ui.flush();assert.equal(ui.button(c.tie).disabled,true,'full playback never supplies blind seconds');
 const closed=ui.playerCalls.filter(x=>x.action==='close').length;
 await ui.listen('A',8);await ui.listen('B',8);assert.equal(ui.button(c.tie).disabled,false);assert.ok(ui.playerCalls.filter(x=>x.action==='close').length>closed);
});
test('opening selected reviews or MV pauses the next blind clip without discarding its real progress',async t=>{
 const ui=await mount(t),c=battleRetroCopy('zh');await ui.listen('A');await ui.listen('B');await ui.button(c.prefer+' A').onClick();await ui.flush();ui.sync();
 await ui.listen('A',4);ui.button(c.play+' A').onClick();await ui.flush();const src=ui.audioProps('A').src;
 ui.reveal().onPause();await ui.flush();assert.equal(ui.els.A.paused,true);assert.equal(ui.els.B.paused,true);assert.equal(ui.audioProps('A').src,src);
 await ui.listen('A',8);await ui.listen('B',8);assert.equal(ui.button(c.tie).disabled,false);
});
