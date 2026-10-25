import {NextRequest,NextResponse} from 'next/server';
import {authorizeCronRequest} from '@/lib/cron-auth';
import {creatorAdmin} from '@/lib/server-creator-auth';
import {AUDIO_STAGING_BUCKET,AUDIO_VERIFIED_BUCKET} from '@/lib/audio-asset-ref';
import {flushDeletedWorkFiles} from '@/lib/server-creator-work-cleanup';
export const preferredRegion="hnd1";
export const maxDuration=120;
export async function GET(request:NextRequest) {
 const auth=authorizeCronRequest(request);if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try {
  const admin=creatorAdmin(),claimed=await admin.rpc('claim_unused_audio_assets');if(claimed.error)throw claimed.error;
  let removed=0;
  for(const asset of claimed.data??[]) {
   const results=await Promise.all([admin.storage.from(AUDIO_STAGING_BUCKET).remove([`${asset.storage_path.split("/")[0]}/${asset.id}.mp3`]),admin.storage.from(AUDIO_VERIFIED_BUCKET).remove([asset.storage_path])]);
   if(results.some(r=>r.error))throw new Error('Storage cleanup failed');
   const result=await admin.from('verified_audio_assets').delete().eq('id',asset.id).eq('status','cleanup');if(result.error)throw result.error;removed++;
  }
  const deletedWorks=await flushDeletedWorkFiles(admin);
  return NextResponse.json({removed,deletedWorks},{headers:{'Cache-Control':'no-store'}});
 } catch{return NextResponse.json({error:'AUDIO_CLEANUP_FAILED'},{status:500});}
}
