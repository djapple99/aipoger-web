import {Suspense} from "react";
import {redirect} from "next/navigation";
import BattleLinkSubmission from "@/components/battle-link-submission";
export default async function BattleSetupPage({searchParams}:{searchParams:Promise<{mode?:string;lang?:string}>}){
  const query=await searchParams;
  if(query.mode==='daily')redirect(`/battle?lang=${['zh','en','ja','ko'].includes(query.lang||'')?query.lang:'zh'}`);
  return <Suspense fallback={<p>AIPOGER…</p>}><BattleLinkSubmission mode="drop"/></Suspense>;
}
