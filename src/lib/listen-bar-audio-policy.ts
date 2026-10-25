import { MP3_ACCEPT, MP3_MAX_BYTES, isMp3Upload } from './mp3-upload-policy.ts';
export const LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES = MP3_MAX_BYTES;
export const LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL = "30MB";
export const LISTEN_BAR_AUDIO_UPLOAD_ACCEPT = MP3_ACCEPT;
export const isAllowedListenBarAudioFile = isMp3Upload;
export function listenBarAudioContentType(_file: File) { void _file; return "audio/mpeg"; }
export function listenBarAudioSizeLabel(file: File) { const mb=file.size/1024/1024;return `${mb>=10?Math.round(mb):mb.toFixed(1)}MB`; }
