import { supabase } from '@/lib/supabase';
import { inspectMp3File } from './mp3-upload-policy';
import { AUDIO_STAGING_BUCKET } from './audio-asset-ref';
export type VerifiedAudio = { assetId: string; path: string; duration: number; maxKbps: number; audioUrl: string };
export async function uploadVerifiedMp3(file: File, onProgress?: (value: number) => void): Promise<VerifiedAudio> {
  await inspectMp3File(file);
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('AUTH_REQUIRED');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const request = async (body: object) => {
    const current = (await supabase.auth.getSession()).data.session;
    if (current?.user.id !== session.user.id) throw new Error('AUTH_REQUIRED');
    const response = await fetch('/api/audio-uploads', {method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${current.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'AUDIO_UPLOAD_FAILED');
    return payload;
  };
  onProgress?.(0);
  const prepared = await request({action:'prepare',name:file.name,size:file.size,sha256});
  if (prepared.asset) { onProgress?.(100); return prepared.asset; }
  const result = await supabase.storage.from(AUDIO_STAGING_BUCKET).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:'audio/mpeg'});
  // A previous successful upload may have lost its HTTP response. Finalization verifies it.
  if (result.error && !/already exists|duplicate/i.test(result.error.message)) throw result.error;
  onProgress?.(80);
  const finished = await request({action:'finish',assetId:prepared.assetId});
  onProgress?.(100); return finished.asset;
}

/** Only unused private drafts can be discarded; published references are protected server-side. */
export async function discardAudioDraft(assetId:string) {
  const session=(await supabase.auth.getSession()).data.session;
  if(!session)return;
  await fetch('/api/audio-uploads',{method:'POST',cache:'no-store',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'discard',assetId})});
}
