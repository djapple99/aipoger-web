import { NextResponse } from 'next/server';
import { creatorAuth } from '@/lib/server-creator-auth';
import { flushDeletedWorkFiles } from '@/lib/server-creator-work-cleanup';
const headers={'Cache-Control':'private, no-store'};
const jsonError=(error:string,status:number)=>NextResponse.json({error},{status,headers});
export async function POST(request:Request) {
 try {
  const auth=await creatorAuth(request);
  if(!auth)return jsonError('請先登入後再刪除作品。',401);
  const body=await request.json().catch(()=>null) as {trackId?:unknown;permanent?:unknown}|null;
  if(typeof body?.trackId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.trackId))return jsonError('Invalid work id.',400);
  // Old open tabs promised recoverable removal. Require the new confirmation.
  if(body.permanent!==true)return jsonError('刪除方式已更新，請重新整理後再次確認永久刪除。',409);
  const removed=await auth.admin.rpc('delete_creator_work',{p_track:body.trackId,p_actor:auth.user.id});
  if(removed.error)return jsonError(removed.error.code==='42501'?'只能刪除自己的作品。':'未能刪除作品，請稍後重試。',removed.error.code==='42501'?403:500);
  if(removed.data?.ok!==true)return jsonError('未能刪除作品，請稍後重試。',500);
  let cleanupPending=false;
  if(removed.data.cleanupJob) {
   try {cleanupPending=(await flushDeletedWorkFiles(auth.admin,removed.data.cleanupJob)).pending>0;}
   catch {cleanupPending=true;}
  }
  return NextResponse.json({ok:true,alreadyDeleted:Boolean(removed.data.alreadyDeleted),cleanupPending},{headers});
 } catch {return jsonError('未能刪除作品，請稍後重試。',500);}
}
