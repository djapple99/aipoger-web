import { uploadVerifiedMp3 } from './audio-upload-client';
export { LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES, LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL, isAllowedListenBarAudioFile, listenBarAudioContentType, listenBarAudioSizeLabel } from './listen-bar-audio-policy';
export function isListenBarStorageSizeLimitError(error: unknown) { const message=String((error as {message?:string})?.message??error).toLowerCase();return message.includes('maximum size exceeded')||message.includes('413')||message.includes('mp3_size_limit'); }
export async function uploadListenBarAudioFile(_bucket: string,_path:string,file:File,_contentType:string,onProgress?:(percent:number)=>void) { return (await uploadVerifiedMp3(file,onProgress)).path; }
