import { readFileSync } from "node:fs";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as tasks from "../../src/lib/admin-tasks.ts";

export function renderOwnerAvatar(count, lang = "zh", unread = 0) {
  let state = 0;
  const react = { ...React, useState(initial) { const i=state++;return [i===0?true:i===21?unread:typeof initial==="function"?initial():initial,()=>{}]; }, useEffect(){}, useCallback:fn=>fn, useMemo:fn=>fn(), useRef:initial=>({current:initial}) };
  const mocks = { react, "react/jsx-runtime": jsxRuntime,
    "next/link": { default: props=>React.createElement("a",props) },
    "next/navigation": {usePathname:()=>"/rank"}, "@/lib/i18n":{useI18n:()=>({lang})},
    "@/lib/auth-bypass":{isAuthBypassEnabled:true}, "@/lib/supabase":{}, "@/lib/battle-pool-client":{},
    "@/lib/admin-tasks":tasks,"@/lib/use-admin-tasks":{useAdminTasks:()=>({data:{counts:{charts:count}}})},
  };
  // Only this isolated renderer uses fake session state; no auth bypass enters the app or browser.
  const code=ts.transpileModule(readFileSync(new URL("../../src/components/global-battle-call-overlay.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const loaded={exports:{}};
  new Function("require","module","exports",code)(name=>{if(!(name in mocks))throw Error(name);return mocks[name]},loaded,loaded.exports);
  return renderToStaticMarkup(React.createElement(loaded.exports.default));
}
