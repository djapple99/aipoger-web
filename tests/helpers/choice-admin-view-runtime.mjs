import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root=fileURLToPath(new URL("../../",import.meta.url)), nativeRequire=createRequire(import.meta.url);
export const entries=[
  {id:"sample-a",kind:"creator",weekStart:"2026-09-14",title:"深夜選曲 / Midnight Choice",curatorName:"策展人 A",isPublished:true,itemCount:6,coverUrl:"/home-art/card-turntable.webp",href:"/choice/sample-a?kind=creator"},
  {id:"sample-b",kind:"official",weekStart:"2026-09-07",title:"LongTitleWithoutSpacesForResponsiveLayoutVerification長標題日本語한국어",curatorName:"策展人 B",isPublished:true,itemCount:10,coverUrl:null,href:"/choice/sample-b?kind=official"}
];
export function viewModules(options={}) {
  let state=0;
  const values=["ready",true,entries,"creator:sample-a",options.query??"",1,false,"",""];
  const react={...React,useState(initial){const i=state++;return [i<values.length?values[i]:initial,()=>{}]},useEffect(){},useCallback:fn=>fn,useMemo:fn=>fn()};
  const mocks={react,"react/jsx-runtime":jsxRuntime,"next/link":{default:props=>React.createElement("a",props)},
    "@/lib/supabase":{supabase:{}},"@/lib/user-profile-admin":{}};
  const cache=new Map();
  function load(file){
    if(cache.has(file))return cache.get(file).exports;
    const loaded={exports:{}};cache.set(file,loaded);
    const code=ts.transpileModule(readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const require=name=>{
      if(Object.hasOwn(mocks,name))return mocks[name];
      if(name.startsWith("@/")){const base="src/"+name.slice(2);return load(base+(existsSync(path.join(root,base+".tsx"))?".tsx":".ts"))}
      return nativeRequire(name);
    };
    new Function("require","module","exports",code)(require,loaded,loaded.exports);
    return loaded.exports;
  }
  return {page:load("src/app/admin/choice/page.tsx"),list:load("src/components/admin-published-choice-list.tsx")};
}
// Node-only fixture rendering; no test account or authentication bypass is shipped.
export function renderChoiceAdmin(options={}){
  return renderToStaticMarkup(React.createElement(viewModules(options).page.default));
}
