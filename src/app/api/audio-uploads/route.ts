import {NextResponse} from 'next/server';
import {creatorAuth} from '@/lib/server-creator-auth';
import {prepareMp3,finishMp3,discardOwnedAudio} from '@/lib/server-audio-uploads';
export const runtime='nodejs';
export const preferredRegion='hnd1';
export const maxDuration=120;
export async function POST(request:Request) {
  const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
  try {
    const auth=await creatorAuth(request);if(!auth)return json({error:'AUTH_REQUIRED'},401);
    const body=await request.json().catch(()=>null);if(!body)return json({error:'INVALID_REQUEST'},400);
    if(body.action==='prepare')return json(await prepareMp3(auth.admin,auth.user.id,body));
    if(body.action==='discard')return json(await discardOwnedAudio(auth.admin,auth.user.id,body.assetId));
    if(body.action==='finish')return json(await finishMp3(auth.admin,auth.user.id,body.assetId));
    return json({error:'INVALID_REQUEST'},400);
  } catch(error) {return json({error:error instanceof Error?error.message:'AUDIO_UPLOAD_FAILED'},400);}
}
