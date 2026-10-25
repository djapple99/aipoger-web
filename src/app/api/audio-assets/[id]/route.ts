import {NextResponse} from 'next/server';
import {creatorAdmin} from '@/lib/server-creator-auth';
import {AUDIO_VERIFIED_BUCKET} from '@/lib/audio-asset-ref';
export const preferredRegion='hnd1';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const fail=()=>NextResponse.json({error:'AUDIO_NOT_PUBLIC'},{status:404,headers:{'Cache-Control':'private, no-store'}});
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return fail();
 try {
  const admin=creatorAdmin();
  const [asset,tracks,queues,official]=await Promise.all([
   admin.from('verified_audio_assets').select('storage_path').eq('id',id).eq('status','verified').maybeSingle(),
   admin.from('listen_bar_tracks').select('id').eq('verified_audio_id',id).eq('is_active',true).eq('review_status','approved').is('hidden_at',null).is('removed_at',null).limit(1),
   admin.from('battle_queue').select('id').eq('verified_audio_id',id).not('rights_confirmed_at','is',null).limit(1),
   admin.from('official_gatekeeper_drops').select('id').eq('verified_audio_id',id).eq('active',true).limit(1),
  ]);
  if(asset.error||tracks.error||queues.error||official.error||!asset.data||(!tracks.data?.length&&!queues.data?.length&&!official.data?.length))return fail();
  const signed=await admin.storage.from(AUDIO_VERIFIED_BUCKET).createSignedUrl(asset.data.storage_path,3600);
  if(signed.error||!signed.data?.signedUrl)return fail();
  const response=NextResponse.redirect(signed.data.signedUrl,307);response.headers.set('Cache-Control','private, no-store');return response;
 } catch{return fail();}
}
