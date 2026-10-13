import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/components/share-button.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
async function mount({native,clipboard=true,legacy=false}={}){
 let cursor=0,tree;const states=[],writes=[],shares=[];
 const modules={react:{useState(v){const i=cursor++;if(!(i in states))states[i]=v;return[states[i],v=>states[i]=v];}},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},'lucide-react':{Share2:'Share2'}};
 const navigator={clipboard:{writeText:async value=>{if(!clipboard)throw new Error('blocked');writes.push(value);}},...(native?{share:async value=>{shares.push(value);if(native==='cancel')throw Object.assign(new Error('cancelled'),{name:'AbortError'});if(native==='fail')throw new Error('unavailable');}}:{})};
 const document={createElement:()=>({style:{},setAttribute(){},focus(){},select(){},remove(){}}),body:{appendChild(){}},execCommand:()=>legacy};
 const window={location:{origin:'https://aipoger.com',href:'https://aipoger.com/mv'},setTimeout(){}};
 const m={exports:{}};new Function('require','module','exports','navigator','document','window',source)(n=>modules[n],m,m.exports,navigator,document,window);
 const render=()=>{cursor=0;tree=m.exports.default({title:'MV',text:'Creator · MV',url:'/mv?lang=zh&track=the-work',label:'分享 MV',copiedLabel:'連結已複製',sharedLabel:'已分享',iconOnly:true});};
 render();await nodes(tree).find(n=>n.type==='button').props.onClick();render();return{writes,shares,nodes:nodes(tree)};
}
test('clipboard sharing preserves the exact MV URL and confirms copying only after success',async()=>{
 const ui=await mount();assert.deepEqual(ui.writes,['Creator · MV\nhttps://aipoger.com/mv?lang=zh&track=the-work']);assert.ok(ui.nodes.some(n=>n.props?.role==='status'&&n.props.children==='連結已複製'));
});
test('native share sends the work URL and reports sharing instead of a false clipboard copy',async()=>{
 const ui=await mount({native:'success'});assert.equal(ui.shares[0].url,'https://aipoger.com/mv?lang=zh&track=the-work');assert.equal(ui.writes.length,0);assert.ok(ui.nodes.some(n=>n.props?.role==='status'&&n.props.children==='已分享'));
});
test('cancelled native share never falls back to copying or claims success',async()=>{
 const ui=await mount({native:'cancel'});assert.equal(ui.writes.length,0);assert.equal(ui.nodes.some(n=>n.props?.role==='status'),false);
});
test('unavailable native sharing falls back to copying; blocked clipboard offers the real URL',async()=>{
 const fallback=await mount({native:'fail'});assert.equal(fallback.writes.length,1);
 const blocked=await mount({clipboard:false});assert.equal(blocked.nodes.some(n=>n.props?.role==='status'),false);assert.equal(blocked.nodes.find(n=>n.type==='input').props.value,'https://aipoger.com/mv?lang=zh&track=the-work');
});
