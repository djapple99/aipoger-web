import { lazyRuntime } from "./lazy-runtime.mjs";
import { albumCopy } from "../../src/lib/album-copy.ts";
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
export const nodes=x=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
export const text=x=>Array.isArray(x)?x.map(text).join(''):x&&typeof x==='object'?text(x.props?.children):typeof x==='string'||typeof x==='number'?String(x):'';
export async function mountMv(t,file,initialProps,mocks,globals={}){
 const compiled=ts.transpileModule(readFileSync(new URL('../../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 let cursor=0,tree,dirty=true,props=initialProps;const states=[],refs=[],effects=[];
 const callbacks=[];
 const react={useCallback(fn,deps){const i=cursor++;if(!callbacks[i]||deps.some((v,j)=>!Object.is(v,callbacks[i].deps[j])))callbacks[i]={deps,fn};return callbacks[i].fn;},useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;dirty=true;}];},useRef(value){return refs[cursor++]??={current:value};},useEffect(fn,deps=[]){const i=cursor++;if(!effects[i]||deps.some((v,j)=>!Object.is(v,effects[i].deps[j]))){effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};}}};
 react.useMemo=(fn)=>{cursor++;return fn();};
 const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},...mocks};
 modules['next/dynamic']=lazyRuntime(modules); modules['@/lib/album-copy']={albumCopy};
 const loaded={exports:{}};const require=name=>{assert.ok(name in modules,name);return modules[name];};
 new Function('require','module','exports',...Object.keys(globals),compiled)(require,loaded,loaded.exports,...Object.values(globals));
 function render(){cursor=0;dirty=false;tree=loaded.exports.default(props);}
 async function flush(){for(let i=0;i<8;i++){await new Promise(setImmediate);if(dirty)render();}}
 render();await flush();t.after(()=>effects.forEach(e=>e?.cleanup?.()));
 return {nodes:()=>nodes(tree),text:()=>text(tree),flush,refs,async update(next){props={...props,...next};render();await flush();},find:type=>nodes(tree).find(x=>x.type===type)?.props};
}
