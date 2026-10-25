export const MP3_MAX_BYTES = 30 * 1024 * 1024;
export const MP3_MAX_KBPS = 320;
export const MP3_ACCEPT = '.mp3,audio/mpeg,audio/mp3';
export const MP3_UPLOAD_LABEL = 'MP3 · ≤320 kbps · ≤30MB';
export function isMp3Upload(file: Pick<File, 'name' | 'type'>) {
  return /\.mp3$/i.test(file.name) && ['', 'audio/mpeg', 'audio/mp3', 'application/octet-stream'].includes(file.type.toLowerCase());
}
export type Mp3Info = { duration: number; maxKbps: number; frames: number; bytes: number };
/** Walk every MPEG Layer III frame. A filename/MIME or an ID3 header alone is insufficient. */
export function inspectMp3(data: Uint8Array): Mp3Info {
  if (!data.length || data.length > MP3_MAX_BYTES) throw new Error('MP3_SIZE_LIMIT');
  let at = 0, end = data.length;
  const text = (offset: number, size: number) => String.fromCharCode(...data.subarray(offset, offset + size));
  if (text(0, 3) === 'ID3') {
    if (data.length < 10 || ![2, 3, 4].includes(data[3]) || data.subarray(6, 10).some(v => v > 127)) throw new Error('INVALID_MP3');
    const size = data[6] * 2097152 + data[7] * 16384 + data[8] * 128 + data[9];
    at = 10 + size + (data[3] === 4 && (data[5] & 16) ? 10 : 0);
    if (at >= end) throw new Error('INVALID_MP3');
  }
  if (end - at >= 128 && text(end - 128, 3) === 'TAG') end -= 128;
  // Common trailing APEv2 metadata is outside the MPEG stream.
  if (end - at >= 32 && text(end - 32, 8) === 'APETAGEX') {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const size = view.getUint32(end - 20, true);
    if (size < 32 || size > end - at) throw new Error('INVALID_MP3');
    end -= size;
    if (end - at >= 32 && text(end - 32, 8) === 'APETAGEX') end -= 32;
  }
  let frames = 0, duration = 0, maxKbps = 0;
  while (at < end) {
    if (end - at <= 4096 && data.subarray(at, end).every(v => v === 0)) break;
    if (at + 4 > end || data[at] !== 255 || (data[at + 1] & 224) !== 224) throw new Error('INVALID_MP3');
    const version = (data[at + 1] >> 3) & 3, layer = (data[at + 1] >> 1) & 3;
    const index = data[at + 2] >> 4, rate = (data[at + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || index === 0 || index === 15 || rate === 3) throw new Error('INVALID_MP3');
    const kbps = (version === 3 ? [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320] : [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index];
    if (kbps > MP3_MAX_KBPS) throw new Error('MP3_BITRATE_LIMIT');
    const hz = [44100,48000,32000][rate] / (version === 3 ? 1 : version === 2 ? 2 : 4);
    const length = Math.floor((version === 3 ? 144000 : 72000) * kbps / hz) + ((data[at + 2] >> 1) & 1);
    if (length < 4 || at + length > end) throw new Error('INVALID_MP3');
    at += length; frames++; duration += (version === 3 ? 1152 : 576) / hz; maxKbps = Math.max(maxKbps, kbps);
  }
  if (frames < 3 || !(duration > 0)) throw new Error('INVALID_MP3');
  return { duration, maxKbps, frames, bytes: data.length };
}
export async function inspectMp3File(file: File) {
  if (!isMp3Upload(file)) throw new Error('MP3_ONLY');
  if (!file.size || file.size > MP3_MAX_BYTES) throw new Error('MP3_SIZE_LIMIT');
  return inspectMp3(new Uint8Array(await file.arrayBuffer()));
}
export function mp3UploadError(code: string, lang = 'zh') {
  const copy: Record<string, string[]> = {
    MP3_ONLY: ['請使用 MP3 音檔；不接受 WAV、AIFF 或其他格式。','Use an MP3 file. WAV, AIFF and other formats are not supported.','MP3ファイルを選択してください。WAV・AIFFなどは使用できません。','MP3 파일을 선택하세요. WAV, AIFF 등은 지원하지 않습니다.'],
    MP3_SIZE_LIMIT: ['MP3 單檔上限為 30MB。','MP3 files must be 30MB or smaller.','MP3は1ファイル30MB以下です。','MP3 파일은 30MB 이하여야 합니다.'],
    MP3_BITRATE_LIMIT: ['MP3 碼率最高 320 kbps。','MP3 bitrate must not exceed 320 kbps.','MP3のビットレートは320 kbps以下です。','MP3 비트레이트는 최대 320 kbps입니다.'],
    INVALID_MP3: ['無法確認為完整的 MP3，請重新匯出標準 MP3（最高 320 kbps）。','Invalid or incomplete MP3. Export a standard MP3 up to 320 kbps.','完全なMP3として確認できません。320 kbps以下で再出力してください。','올바른 MP3 파일이 아닙니다. 최대 320 kbps로 다시 내보내세요.'],
  };
  return copy[code]?.[lang === 'en' ? 1 : lang === 'ja' ? 2 : lang === 'ko' ? 3 : 0]
    ?? ({zh:'音檔尚未完成驗證，請重試。',en:'Audio verification did not finish. Please retry.',ja:'音声の確認が完了していません。再試行してください。',ko:'오디오 검증이 완료되지 않았습니다. 다시 시도하세요.'}[lang] ?? 'Audio verification did not finish. Please retry.');
}
