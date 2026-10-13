import test from "node:test";
import assert from "node:assert/strict";
import { mountMv, text } from "./helpers/mv-runtime.mjs";
import { battleRetroCopy } from "../src/lib/battle-retro-copy.ts";
import { BLIND_END, BLIND_MIN_SECONDS, BLIND_START } from "../src/lib/blind-listening.ts";
async function mount(t,{lang="zh",guest=false,failVote=false,nextFails=false}={}) {
 let session=guest?null:{access_token:"test",user:{id:"reader"}},authChanged,clock=0,active=null,last=15,counter=0;
 const calls=[],heard={A:0,B:0};
 const question=()=>({id:session.user.id+"-q"+counter,audioA:"/anonymous-a-"+session.user.id+counter,audioB:"/anonymous-b-"+session.user.id+counter,heardA:0,heardB:0,expiresAt:"2099-01-01"});
 const icons=Object.fromEntries(["ArrowLeft","Equal","Heart","Pause","Play","RotateCcw"].map(k=>[k,()=>null]));
 const ui=await mountMv(t,"src/components/blind-listening-room.tsx",{},{
   "next/link":{__esModule:true,default:"a"},
   "lucide-react":icons,"./editorial-header":{__esModule:true,default:()=>null},
   "@/lib/i18n":{useI18n:()=>({lang})},"@/lib/battle-retro-copy":{battleRetroCopy},
   "@/lib/blind-listening":{BLIND_END,BLIND_MIN_SECONDS,BLIND_START},"./battle-retro.module.css":{__esModule:true,default:{}},
   "@/lib/music-player-store":{musicPlayer:{close(){}}},
   "@/lib/supabase":{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){authChanged=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
 },{performance:{now:()=>clock},fetch:async(url,init={})=>{
   const body=init.body?JSON.parse(init.body):null;calls.push(body);
   if(!body)return {ok:true,json:async()=>({question:question()})};
   if(body.action==="tick"){
     if(active===body.side)heard[body.side]=Math.min(30,heard[body.side]+Math.max(0,body.position-last));
     last=body.position;active=body.event==="pause"?null:body.side;
     return {ok:true,json:async()=>({heardA:heard.A,heardB:heard.B})};
   }
   if(failVote)return {ok:false,json:async()=>({error:"SAVE_FAILED"})};
   counter++;heard.A=heard.B=0;active=null;
   return {ok:true,json:async()=>({choice:body.choice,awarded:3,balance:3,nextQuestion:nextFails?null:question(),nextError:nextFails})};
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
 return {...ui,button,listen,calls,els,audioProps,sync,async switchUser(id){session={access_token:"new",user:{id}};heard.A=heard.B=0;authChanged("SIGNED_IN",session);await ui.flush();sync();}};
}
for(const lang of ["zh","en","ja","ko"])test("blind room "+lang+" requires eight seconds on both sides then automatically advances",async t=>{
 const ui=await mount(t,{lang}),c=battleRetroCopy(lang);
 assert.ok(ui.text().includes(c.listenFirst));assert.equal(ui.button(c.tie).disabled,true);
 assert.equal(ui.audioProps("A").preload,"metadata");assert.ok(ui.audioProps("B").src,"B is prepared before clicking play");
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
