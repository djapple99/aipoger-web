import 'server-only';
import { randomUUID, createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MP3_MAX_BYTES, inspectMp3 } from './mp3-upload-policy';
import { AUDIO_STAGING_BUCKET, AUDIO_VERIFIED_BUCKET, audioAssetUrl } from './audio-asset-ref';
type Asset = { id:string;user_id:string;sha256:string;expected_size:number;storage_path:string;status:string;duration_seconds:number|null;max_kbps:number|null };
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export async function verifiedAudioResult(admin:SupabaseClient, asset:Asset) {
  if(asset.status!=='verified')throw new Error('AUDIO_NOT_VERIFIED');
  const signed=await admin.storage.from(AUDIO_VERIFIED_BUCKET).createSignedUrl(asset.storage_path,3600);
  if(signed.error||!signed.data?.signedUrl)throw new Error('AUDIO_UNAVAILABLE');
  return {assetId:asset.id,path:audioAssetUrl(asset.id),duration:asset.duration_seconds,maxKbps:asset.max_kbps,audioUrl:signed.data.signedUrl};
}
export async function readOwnedAudio(admin:SupabaseClient,id:string,userId:string) {
  const result=await admin.from('verified_audio_assets').select('*').eq('id',id).eq('user_id',userId).maybeSingle();
  if(result.error||!result.data||result.data.status!=='verified')throw new Error('AUDIO_NOT_VERIFIED');
  return result.data as Asset;
}
export async function prepareMp3(admin:SupabaseClient,userId:string,body:{name?:unknown;size?:unknown;sha256?:unknown}) {
  if(typeof body.name!=='string'||!/^.{1,240}\.mp3$/i.test(body.name))throw new Error('MP3_ONLY');
  if(typeof body.size!=='number'||!Number.isInteger(body.size)||body.size<=0||body.size>MP3_MAX_BYTES)throw new Error('MP3_SIZE_LIMIT');
  if(typeof body.sha256!=='string'||!/^[0-9a-f]{64}$/.test(body.sha256))throw new Error('INVALID_AUDIO_HASH');
  let prior=await admin.from('verified_audio_assets').select('*').eq('user_id',userId).eq('sha256',body.sha256).maybeSingle();
  if(prior.error)throw new Error('AUDIO_UNAVAILABLE');
  const recovering=Boolean(prior.data);
  if(!prior.data) {
    const id=randomUUID();
    const insert=await admin.from('verified_audio_assets').insert({id,user_id:userId,sha256:body.sha256,expected_size:body.size,storage_path:`${userId}/${body.sha256}.mp3`,status:'pending'});
    if(insert.error&&insert.error.code!=='23505')throw new Error('AUDIO_UNAVAILABLE');
    prior=await admin.from('verified_audio_assets').select('*').eq('user_id',userId).eq('sha256',body.sha256).maybeSingle();
  }
  if(!prior.data||prior.data.status==='cleanup')throw new Error('AUDIO_UNAVAILABLE');
  const touched=await admin.from('verified_audio_assets').update({updated_at:new Date().toISOString()}).eq('id',prior.data.id).neq('status','cleanup').select('*').maybeSingle();
  const asset=touched.data as Asset;
  if(touched.error||!asset)throw new Error('AUDIO_UNAVAILABLE');
  if(asset.expected_size!==body.size)throw new Error('AUDIO_HASH_MISMATCH');
  if(asset.status==='verified')return {asset:await verifiedAudioResult(admin,asset)};
  if(recovering) {
    try {return await finishMp3(admin,userId,asset.id);} catch(error) {
      if(!(error instanceof Error)||!['AUDIO_UPLOAD_INCOMPLETE','INVALID_MP3','MP3_SIZE_LIMIT','AUDIO_HASH_MISMATCH','MP3_BITRATE_LIMIT'].includes(error.message))throw error;
    }
  }
  const path=`${userId}/${asset.id}.mp3`;
  const signed=await admin.storage.from(AUDIO_STAGING_BUCKET).createSignedUploadUrl(path,{upsert:false});
  if(signed.error||!signed.data?.token)throw new Error('AUDIO_UPLOAD_FAILED');
  return {assetId:asset.id,path,token:signed.data.token};
}
export async function finishMp3(admin:SupabaseClient,userId:string,id:unknown) {
  if(!uuid(id))throw new Error('INVALID_AUDIO_ID');
  const row=await admin.from('verified_audio_assets').select('*').eq('id',id).eq('user_id',userId).maybeSingle();
  if(row.error||!row.data||row.data.status==='cleanup')throw new Error('AUDIO_UNAVAILABLE');
  const asset=row.data as Asset;
  if(asset.status==='verified')return {asset:await verifiedAudioResult(admin,asset)};
  const staged=`${userId}/${id}.mp3`;
  const downloaded=await admin.storage.from(AUDIO_STAGING_BUCKET).download(staged);
  if(downloaded.error||!downloaded.data)throw new Error('AUDIO_UPLOAD_INCOMPLETE');
  try {
    if(downloaded.data.size!==asset.expected_size||downloaded.data.size>MP3_MAX_BYTES)throw new Error('MP3_SIZE_LIMIT');
    const bytes=new Uint8Array(await downloaded.data.arrayBuffer());
    const info=inspectMp3(bytes);
    if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('AUDIO_HASH_MISMATCH');
    const details={status:'validating',updated_at:new Date().toISOString(),duration_seconds:info.duration,max_kbps:info.maxKbps,verified_at:new Date().toISOString()};
    const start=await admin.from('verified_audio_assets').update(details).eq('id',id).eq('user_id',userId).in('status',['pending','validating']).select('*').maybeSingle();
    if(start.error)throw new Error('AUDIO_VERIFY_FAILED');
    if(!start.data)return {asset:await verifiedAudioResult(admin,await readOwnedAudio(admin,id,userId))};
    const saved=await admin.storage.from(AUDIO_VERIFIED_BUCKET).upload(asset.storage_path,bytes,{contentType:'audio/mpeg',upsert:false});
    if(saved.error&&!/already exists|duplicate/i.test(saved.error.message))throw new Error('AUDIO_SAVE_FAILED');
    const confirmed=await admin.from('verified_audio_assets').update({status:'verified'}).eq('id',id).eq('user_id',userId).eq('status','validating').select('*').maybeSingle();
    if(confirmed.error)throw new Error('AUDIO_VERIFY_FAILED');
    const ready=confirmed.data??await readOwnedAudio(admin,id,userId);
    await admin.storage.from(AUDIO_STAGING_BUCKET).remove([staged]);
    return {asset:await verifiedAudioResult(admin,ready)};
  } catch(error) {
    if(error instanceof Error&&['INVALID_MP3','MP3_SIZE_LIMIT','MP3_BITRATE_LIMIT','AUDIO_HASH_MISMATCH'].includes(error.message))await admin.storage.from(AUDIO_STAGING_BUCKET).remove([staged]);
    throw error;
  }
}

export async function discardOwnedAudio(admin:SupabaseClient,userId:string,id:unknown) {
  if(!uuid(id))throw new Error('INVALID_AUDIO_ID');
  const claimed=await admin.rpc('claim_audio_asset_cleanup',{p_id:id,p_actor:userId});
  if(claimed.error)throw new Error('AUDIO_CLEANUP_FAILED');
  for(const asset of claimed.data??[]) {
    const removed=await Promise.all([admin.storage.from(AUDIO_STAGING_BUCKET).remove([`${userId}/${asset.id}.mp3`]),admin.storage.from(AUDIO_VERIFIED_BUCKET).remove([asset.storage_path])]);
    if(removed.some(r=>r.error))throw new Error('AUDIO_CLEANUP_FAILED');
    const deleted=await admin.from('verified_audio_assets').delete().eq('id',asset.id).eq('user_id',userId).eq('status','cleanup');
    if(deleted.error)throw new Error('AUDIO_CLEANUP_FAILED');
  }
  return {discarded:Boolean(claimed.data?.length)};
}
