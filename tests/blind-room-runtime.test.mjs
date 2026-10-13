import test from "node:test";
import assert from "node:assert/strict";
import { mountMv, text } from "./helpers/mv-runtime.mjs";
import { battleRetroCopy } from "../src/lib/battle-retro-copy.ts";
import { BLIND_END, BLIND_START } from "../src/lib/blind-listening.ts";
async function mount(t,{lang="zh",guest=false,failVote=false}={}) {
 let session=guest?null:{access_token:"test",user:{id:"reader"}},authChanged,clock=0,active=null,last=15,counter=0;
 const calls=[],heard={A:0,B:0};const q={id:"q1",audioA:"/anonymous-a",audioB:"/anonymous-b",heardA:0,heardB:0,expiresAt:"2099-01-01"};
 const icons=Object.fromEntries(["ArrowLeft","ArrowRight","Equal","Heart","Pause","Play","RotateCcw"].map(k=>[k,()=>null]));
 const ui=await mountMv(t,"src/components/blind-listening-room.tsx",{},{
   "next/link":{__esModule:true,default:"a"},
   "lucide-react":icons,"./editorial-header":{__esModule:true,default:()=>null},
   "@/lib/i18n":{useI18n:()=>({lang})},"@/lib/battle-retro-copy":{battleRetroCopy},
   "@/lib/blind-listening":{BLIND_END,BLIND_START},"./battle-retro.module.css":{__esModule:true,default:{}},
   "@/lib/music-player-store":{musicPlayer:{close(){}}},
   "@/lib/supabase":{supabase:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){authChanged=fn;return {data:{subscription:{unsubscribe(){}}}};}}}},
 },{performance:{now:()=>clock},fetch:async(url,init={})=>{
   const body=init.body?JSON.parse(init.body):null;calls.push(body);
   if(!body)return {ok:true,json:async()=>({question:{...q,id:counter?"q2":"q1"},credits:{balance:0}})};
   if(body.action==="tick"){
     if(active===body.side)heard[body.side]=Math.min(30,heard[body.side]+Math.max(0,body.position-last));
     last=body.position;active=body.event==="pause"?null:body.side;
     return {ok:true,json:async()=>({heardA:heard.A,heardB:heard.B})};
   }
   if(body.action==="skip"){counter++;heard.A=heard.B=0;return {ok:true,json:async()=>({skipped:true})};}
   return {ok:!failVote,json:async()=>failVote?{error:"SAVE_FAILED"}:{choice:body.choice,awarded:3,balance:3,works:[{side:"A",id:"original-a",title:"Revealed A",artist:"Creator A"},{side:"B",id:"original-b",title:"Revealed B",artist:"Creator B"}]}};
 }});
 const el={src:"",currentTime:0,duration:120,paused:true,load(){this.currentTime=0;},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},removeAttribute(){this.src="";}};
 ui.find("audio").ref.current=el;
 const button=s=>ui.nodes().find(n=>n.type==="button"&&text(n).trim()===s)?.props;
 async function listen(side){
   button(battleRetroCopy(lang).play+" "+side).onClick();ui.find("audio").onLoadedMetadata();await ui.flush();
   assert.equal(el.currentTime,15);
   for(let i=1;i<=15;i++){clock+=2100;el.currentTime=15+i*2;ui.find("audio").onTimeUpdate();await ui.flush();}
   assert.equal(el.currentTime,45);assert.equal(el.paused,true);
 }
 return {...ui,button,listen,calls,el,async switchUser(id){session={access_token:"new",user:{id}};authChanged("SIGNED_IN",session);await ui.flush();}};
}
for(const lang of ["zh","en","ja","ko"])test("blind room "+lang+" limits each excerpt, keeps identity hidden until choosing and reveals originals",async t=>{
 const ui=await mount(t,{lang}),c=battleRetroCopy(lang);
 assert.equal(ui.button(c.tie).disabled,true);assert.equal(ui.text().includes("Revealed A"),false);
 await ui.listen("A");assert.equal(ui.button(c.tie).disabled,true);await ui.listen("B");
 assert.equal(ui.button(c.tie).disabled,false);
 const before=ui.calls.length;ui.find("audio").onTimeUpdate();await ui.flush();assert.equal(ui.calls.length,before,"end events must not loop");
 await ui.button(c.tie).onClick();await ui.flush();
 assert.ok(ui.text().includes(c.awarded));assert.ok(ui.text().includes("Revealed A"));
 const votes=ui.calls.filter(x=>x?.action==="vote");assert.equal(votes.length,1);assert.equal(votes[0].choice,"tie");
 assert.equal(ui.button(c.next).disabled,false);ui.button(c.next).onClick();await ui.flush();
 assert.equal(ui.text().includes("Revealed A"),false);assert.equal(ui.button(c.tie).disabled,true);
});
test("retry preserves the user's explicit A preference and never invents a tie",async t=>{
 const ui=await mount(t,{failVote:true}),c=battleRetroCopy("zh");
 await ui.listen("A");await ui.listen("B");await ui.button(c.prefer+" A").onClick();await ui.flush();
 assert.ok(ui.text().includes(c.saveFailed));await ui.button(c.retry).onClick();await ui.flush();
 assert.deepEqual(ui.calls.filter(x=>x?.action==="vote").map(x=>x.choice),["A","A"]);
 assert.equal(ui.text().includes("Revealed A"),false);
});
test("guest sees a sign-in return to blind room and cannot vote or play",async t=>{
 const ui=await mount(t,{guest:true}),c=battleRetroCopy("zh");
 assert.equal(ui.button(c.play+" A").disabled,true);assert.equal(ui.button(c.tie).disabled,true);
 const link=ui.nodes().find(n=>n.type==="a"&&text(n)===c.login);
 assert.ok(link.props.href.includes(encodeURIComponent("/battle/listen?lang=zh")));
 assert.equal(ui.calls.length,0);
});
test("changing account clears revealed songs, voting state and audio",async t=>{
 const ui=await mount(t),c=battleRetroCopy("zh");
 await ui.listen("A");await ui.listen("B");await ui.button(c.prefer+" B").onClick();await ui.flush();
 await ui.switchUser("other");assert.equal(ui.text().includes("Revealed A"),false);assert.equal(ui.el.src,"");
 assert.equal(ui.button(c.tie).disabled,true);
});
