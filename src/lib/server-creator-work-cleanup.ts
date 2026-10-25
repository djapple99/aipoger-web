import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { audioAssetId } from './audio-asset-ref';
import { discardOwnedAudio } from './server-audio-uploads';
type CleanupJob={id:string;actor_id:string;audio_path:string|null;cover_path:string|null};
function ownPath(path:string|null,userId:string) {
 return path?.startsWith(`${userId}/`)&&!path.includes('..')&&!/[\u0000-\u001f]/.test(path)?path:null;
}
// Jobs are created atomically with deletion and removed after Storage cleanup.
export async function cleanDeletedWorkFiles(admin:SupabaseClient,job:CleanupJob) {
 const assetId=audioAssetId(job.audio_path);
 if(assetId)await discardOwnedAudio(admin,job.actor_id,assetId);
 for(const [bucket,value] of [['listen-bar-audio',job.audio_path],['listen-bar-covers',job.cover_path]] as const) {
  const path=ownPath(value,job.actor_id);
  if(!path)continue;
  const publicUrl=admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const checks=await Promise.all([path,publicUrl].map(p=>admin.rpc('creator_work_file_referenced',{p_path:p})));
  if(checks.some(r=>r.error))throw new Error('Reference check failed');
  if(checks.some(r=>r.data))continue;
  const result=await admin.storage.from(bucket).remove([path]);
  if(result.error)throw result.error;
 }
 const removed=await admin.from('creator_work_file_cleanup').delete().eq('id',job.id);
 if(removed.error)throw removed.error;
}
export async function flushDeletedWorkFiles(admin:SupabaseClient,id?:string) {
 let query=admin.from('creator_work_file_cleanup').select('id,actor_id,audio_path,cover_path').order('created_at').limit(50);
 if(id)query=query.eq('id',id);
 const jobs=await query;if(jobs.error)throw jobs.error;
 let completed=0,pending=0;
 for(const job of (jobs.data??[]) as CleanupJob[]) {
  try {await cleanDeletedWorkFiles(admin,job);completed++;}
  catch {pending++;}
 }
 return {completed,pending};
}
