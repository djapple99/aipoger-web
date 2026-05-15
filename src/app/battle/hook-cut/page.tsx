// src/app/battle/hook-cut/page.tsx
'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { supabase } from '@/lib/supabase';
import { isAuthBypassEnabled, mockUserId } from '@/lib/auth-bypass';

const MAX_HOOK_SECONDS = 45;
const MIN_REGION_SECONDS = 0.25;

type RegionTimes = { start: number; end: number };

// ─── i18n ───────────────────────────────────────────────
type Lang = 'zh' | 'en';

const T = {
  zh: {
    title: 'Hook 裁切',
    subtitle: '最多 45 秒 · 系統會自動 Mastering 美化聲音',
    uploadPrompt: '上傳完整歌曲',
    uploadHint: '拖曳波形選擇 Hook',
    selection: '選取',
    duration: '（{s}秒）',
    dragHint: '拖左/右邊緣調整長度（最多 45 秒） · 拖中間移動 · 空白鍵預覽/暫停（從選取起點）',
    mastering: '啟用自動 Mastering',
    masteringDesc: '3-band EQ + Compressor + Limiter + Gain 提升清晰度與響度',
    preview: '▶️ 即時預覽選取區間',
    masteringOn: '自動 Mastering',
    masteringOff: '原始音檔',
    confirmUpload: '確認上傳',
    uploadingPrepare: '準備上傳…',
    uploadingAudio: '正在處理音檔…',
    uploading: '上傳中…',
    uploadingSaving: '寫入資料庫…',
    success: '上傳成功！即將進入配對…',
    uploadError: '上傳失敗，請稍後再試',
    noFile: '請先上傳音檔並選擇 Hook 區間',
    challengeFeeFail: 'APC 點數不足 200，無法進入配對。請先累積點數（每日簽到或來賓禮）。',
    decording: '解析音檔中…',
    playing: '播放中',
    fighter: '鬥士',
    song: '歌曲',
    proTip: '專業模式：拖曳中即時硬限制 45 秒（超過會自動彈回）',
  },
  en: {
    title: 'Hook Cut',
    subtitle: 'Max 45 seconds · Auto Mastering to enhance sound',
    uploadPrompt: 'Upload Full Song',
    uploadHint: 'Drag waveform to select Hook',
    selection: 'Selection',
    duration: '({s}s)',
    dragHint: 'Drag edges to adjust length (max 45s) · Drag middle to move · Spacebar to preview/pause',
    mastering: 'Enable Auto Mastering',
    masteringDesc: '3-band EQ + Compressor + Limiter + Gain for clarity and loudness',
    preview: '▶️ Preview Selection',
    masteringOn: 'Auto Mastering',
    masteringOff: 'Original',
    confirmUpload: 'Confirm Upload',
    uploadingPrepare: 'Preparing…',
    uploadingAudio: 'Processing audio…',
    uploading: 'Uploading…',
    uploadingSaving: 'Saving to database…',
    success: 'Uploaded! Entering matchmaking…',
    uploadError: 'Upload failed, please try again',
    noFile: 'Please upload audio and select a Hook region first',
    challengeFeeFail: 'You need 200 APC to enter matchmaking. Earn points via daily check-in or signup bonus.',
    decording: 'Decoding audio…',
    playing: 'Playing',
    fighter: 'Fighter',
    song: 'Song',
    proTip: 'Professional: Real-time hard limit 45s (auto-corrects on drag)',
  },
} as const;

function getT(lang: Lang) {
  return T[lang];
}

// ─── WAV 渲染工廠（OfflineAudioContext）─────────────────────
async function renderAudioWithMastering(
  buffer: AudioBuffer,
  start: number,
  end: number,
  enableMastering: boolean,
): Promise<Blob> {
  const sampleRate = buffer.sampleRate;
  const clampedEnd = Math.min(end, buffer.duration);
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(clampedEnd * sampleRate);
  const length = Math.max(1, endSample - startSample);
  const maxLength = MAX_HOOK_SECONDS * sampleRate;
  const renderLength = Math.min(length, maxLength);

  const offlineCtx = new OfflineAudioContext(2, renderLength, sampleRate);

  const src = offlineCtx.createBufferSource();
  src.buffer = buffer;
  let out: AudioNode = src;

  if (enableMastering) {
    const low = offlineCtx.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = 3;
    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8; mid.gain.value = -2;
    const high = offlineCtx.createBiquadFilter();
    high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = 2;
    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 5;
    comp.attack.value = 0.002; comp.release.value = 0.15;
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.05;
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = Math.pow(10, 2 / 20);

    src.connect(low); low.connect(mid); mid.connect(high);
    high.connect(comp); comp.connect(limiter); limiter.connect(gainNode);
    out = gainNode;
  }

  out.connect(offlineCtx.destination);
  src.start(0, start, renderLength / sampleRate);

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);

  const body = new ArrayBuffer(dataSize);
  const bodyView = new DataView(body);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      bodyView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([header, body], { type: 'audio/wav' });
}

/** Supabase Storage 依 bucket allowed_mime_types 驗證 Content-Type；失敗時可改試常見 WAV 別名 */
function isLikelyStorageMimeRejection(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes('mime') ||
    (msg.includes('invalid') && msg.includes('type')) ||
    msg.includes('not allowed') ||
    msg.includes('unsupported') ||
    msg.includes('415')
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("readAsDataURL failed"));
    reader.readAsDataURL(blob);
  });
}

async function uploadHookWav(
  storagePath: string,
  wavBlob: Blob,
  fileName: string,
): Promise<void> {
  if (isAuthBypassEnabled) {
    const segments = storagePath.split("/");
    const userId = segments[0] ?? "";
    if (!userId) {
      throw new Error("Invalid storagePath for upload-hook");
    }
    const audioBase64 = await blobToBase64(wavBlob);
    const formData = new FormData();
    formData.append("storagePath", storagePath);
    formData.append("audioBase64", audioBase64);
    formData.append("userId", userId);
    const res = await fetch("/api/upload-hook", {
      method: "POST",
      body: formData,
    });
    const payload = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
    if (!res.ok || !payload.path) {
      throw new Error(payload.error ?? res.statusText ?? "upload-hook failed");
    }
    return;
  }

  const mimeAttempts = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] as const;
  let lastError: unknown;

  for (const contentType of mimeAttempts) {
    const body = new File([wavBlob], fileName, { type: contentType });
    const { error } = await supabase.storage.from('battle-audio').upload(storagePath, body, {
      contentType,
      upsert: false,
    });
    if (!error) return;
    lastError = error;
    if (!isLikelyStorageMimeRejection(error)) break;
  }

  throw lastError;
}

type RpcQueueRow = {
  id?: string;
  status?: string;
  match_group_id?: string | null;
};

// ─── 主要內容（Suspense 內才能用 useSearchParams）───────────

function HookCutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fighterName = searchParams.get('fighterName') ?? '未命名鬥士';
  const songName = searchParams.get('songName') ?? '未提供';
  const genre = searchParams.get('genre') ?? '';
  const aiTool = searchParams.get('aiTool') ?? '';
  const coverUrl = searchParams.get('coverUrl');
  const lang = (searchParams.get('lang') ?? 'zh') as Lang;

  const t = getT(lang);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [enableMastering, setEnableMastering] = useState(true);
  const [regionTimes, setRegionTimes] = useState<RegionTimes>({ start: 0, end: 0 });
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const lastRegionRef = useRef<RegionTimes | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const playWindowRef = useRef<RegionTimes | null>(null);
  const playStartedAtRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);

  const formatTime = useMemo(() => {
    const two = (n: number) => String(Math.floor(n)).padStart(2, '0');
    return (seconds: number) => {
      const s = Math.max(0, seconds);
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return `${two(mm)}:${two(ss)}`;
    };
  }, []);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  };

  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const cancelRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopPlayback = () => {
    clearStopTimer();
    cancelRaf();
    playWindowRef.current = null;
    setIsPlaying(false);
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      try { src.onended = null; src.stop(); } catch { /* ignore */ }
      try { src.disconnect(); } catch { /* ignore */ }
    }
  };

  const syncCursorWhilePlaying = () => {
    const ws = wavesurferRef.current;
    const ctx = audioCtxRef.current;
    const windowTimes = playWindowRef.current;
    if (!ws || !ctx || !windowTimes) return;
    const now = ctx.currentTime;
    const played = Math.max(0, now - playStartedAtRef.current);
    const current = playOffsetRef.current + played;
    const clamped = Math.min(windowTimes.end, Math.max(windowTimes.start, current));
    ws.setTime(clamped);
    rafRef.current = requestAnimationFrame(syncCursorWhilePlaying);
  };

  const playFromRegion = async () => {
    const buffer = audioBufferRef.current;
    const region = regionRef.current;
    if (!buffer || !region) return;

    const start = Math.max(0, region.start);
    const end = Math.min(region.end, durationRef.current || buffer.duration);
    const length = Math.max(0, end - start);
    if (length <= 0.01) return;

    stopPlayback();
    const ctx = ensureAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    let out: AudioNode = src;

    if (enableMastering) {
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = 3;
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8; mid.gain.value = -2;
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = 2;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 5;
      comp.attack.value = 0.002; comp.release.value = 0.15;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.05;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.pow(10, 2 / 20);

      src.connect(low); low.connect(mid); mid.connect(high);
      high.connect(comp); comp.connect(limiter); limiter.connect(gainNode);
      out = gainNode;
    }

    out.connect(ctx.destination);
    sourceRef.current = src;
    playWindowRef.current = { start, end };
    playStartedAtRef.current = ctx.currentTime;
    playOffsetRef.current = start;
    setIsPlaying(true);

    src.onended = () => {
      stopPlayback();
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(end);
    };

    src.start(0, start, Math.min(length, MAX_HOOK_SECONDS));
    stopTimerRef.current = window.setTimeout(() => {
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(end);
      stopPlayback();
    }, Math.ceil(length * 1000));

    cancelRaf();
    rafRef.current = requestAnimationFrame(syncCursorWhilePlaying);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopPlayback();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setIsReady(false);
    setRegionTimes({ start: 0, end: 0 });
    setIsDecoding(true);
    try {
      const ctx = ensureAudioContext();
      const ab = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab.slice(0));
      audioBufferRef.current = decoded;
    } finally {
      setIsDecoding(false);
    }
  };

  // WaveSurfer init
  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch { /* ignore */ }
      wavesurferRef.current = null;
    }
    regionRef.current = null;
    durationRef.current = 0;
    lastRegionRef.current = null;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 220,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      interact: true,
      autoScroll: true,
      hideScrollbar: true,
      cursorWidth: 2,
      cursorColor: '#f97316',
      waveColor: '#fb923c',
      progressColor: '#f97316',
    });

    const regions = ws.registerPlugin(Regions.create());

    const clampRegion = (nextStart: number, nextEnd: number) => {
      const duration = durationRef.current || 0;
      let start = Number.isFinite(nextStart) ? nextStart : 0;
      let end = Number.isFinite(nextEnd) ? nextEnd : 0;
      start = Math.max(0, start);
      end = Math.min(Math.max(0, end), duration);
      if (end - start < MIN_REGION_SECONDS) end = Math.min(duration, start + MIN_REGION_SECONDS);
      if (end - start > MAX_HOOK_SECONDS) end = Math.min(duration, start + MAX_HOOK_SECONDS);
      if (end - start < MIN_REGION_SECONDS) start = Math.max(0, end - MIN_REGION_SECONDS);
      return { start, end };
    };

    const applyRegion = (start: number, end: number) => {
      const region = regionRef.current;
      if (!region) return;
      const next = clampRegion(start, end);
      const eps = 0.002;
      if (Math.abs(region.start - next.start) > eps) region.setOptions({ start: next.start });
      if (Math.abs(region.end - next.end) > eps) region.setOptions({ end: next.end });
      setRegionTimes({ start: next.start, end: next.end });
      lastRegionRef.current = { start: next.start, end: next.end };
    };

    ws.load(audioUrl);

    ws.on('ready', () => {
      durationRef.current = ws.getDuration() || 0;
      const initialEnd = Math.min(MAX_HOOK_SECONDS, durationRef.current);
      const region = regions.addRegion({
        id: 'hook',
        start: 0,
        end: Math.max(MIN_REGION_SECONDS, initialEnd),
        color: 'rgba(228, 228, 231, 0.22)',
        drag: true,
        resize: true,
      });

      regionRef.current = region;
      lastRegionRef.current = { start: region.start, end: region.end };
      setRegionTimes({ start: region.start, end: region.end });
      setIsReady(true);

      region.on('update', () => {
        const prev = lastRegionRef.current;
        if (!prev) { lastRegionRef.current = { start: region.start, end: region.end }; return; }

        const rawStart = region.start;
        const rawEnd = region.end;
        let start = rawStart;
        let end = rawEnd;
        const duration = durationRef.current || 0;

        start = Math.max(0, start);
        end = Math.min(duration, end);

        if (end - start > MAX_HOOK_SECONDS) {
          if (Math.abs(rawStart - prev.start) > 0.001 && Math.abs(rawEnd - prev.end) <= 0.001) {
            start = end - MAX_HOOK_SECONDS;
          } else {
            end = start + MAX_HOOK_SECONDS;
          }
        }

        if (end - start < MIN_REGION_SECONDS) {
          if (Math.abs(rawStart - prev.start) > 0.001) start = end - MIN_REGION_SECONDS;
          else end = start + MIN_REGION_SECONDS;
        }

        if (start < 0) { const shift = -start; start = 0; end = Math.min(duration, end + shift); }
        if (end > duration) { const shift = end - duration; end = duration; start = Math.max(0, start - shift); }

        applyRegion(start, end);
      });

      region.on('update-end', () => {
        const { start, end } = clampRegion(region.start, region.end);
        region.setOptions({ start, end });
        setRegionTimes({ start, end });
        lastRegionRef.current = { start, end };
      });
    });

    wavesurferRef.current = ws;

    return () => {
      try { ws.destroy(); } catch { /* ignore */ }
      if (wavesurferRef.current === ws) wavesurferRef.current = null;
    };
  }, [audioUrl]);

  // Spacebar preview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      if (!isReady || !audioBufferRef.current) return;
      e.preventDefault();
      if (isPlaying) stopPlayback();
      else void playFromRegion();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReady, isPlaying, enableMastering]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) void ctx.close();
    };
  }, []);

  // ── 確認上傳（核心流程）──────────────────────────────
  const handleConfirmUpload = async () => {
    if (!isReady || !audioBufferRef.current || !regionRef.current) {
      alert(t.noFile);
      return;
    }

    const region = regionRef.current;
    const { start, end } = region;

    setUploadPhase(t.uploadingPrepare);

    try {
      const buffer = audioBufferRef.current;

      setUploadPhase(t.uploadingAudio);

      // Offline render → WAV blob（含 mastering）
      const wavBlob = await renderAudioWithMastering(buffer, start, end, enableMastering);
      const sanitizedFighter = fighterName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '');
      const sanitizedSong = songName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, '');
      const fileName = `${sanitizedFighter}_${sanitizedSong}_${Date.now()}.wav`;

      setUploadPhase(t.uploading);

      const userId = isAuthBypassEnabled
        ? "00000000-0000-0000-0000-000000000001"
        : (await supabase.auth.getSession()).data.session?.user.id ?? mockUserId;

      // 上傳到 Supabase Storage（WAV MIME 與 bucket 白名單一致；失敗時自動試別名）
      const storagePath = `${userId}/hooks/${fileName}`;
      await uploadHookWav(storagePath, wavBlob, fileName);

      setUploadPhase(t.uploadingSaving);

      let queueIdForNav: string;
      let nextPath: string;

// 進配對前扣挑戰費 200 APC，並寫入佇列（含 AI 工具供擂台顯示）
      // 測試模式：NEXT_PUBLIC_AUTH_BYPASS=true 時跳過扣費（老闆模式）
      if (!isAuthBypassEnabled) {
        // 先確保 user_profiles 存在（第一次報名時建立）
        const { error: profileErr } = await supabase.from("user_profiles").upsert({ id: userId }, { onConflict: "id" });
        if (profileErr) {
          console.error("[hook-cut] user_profiles upsert", profileErr);
          throw profileErr;
        }

        const { data: deducted, error: feeErr } = await supabase.rpc("deduct_challenge_fee", {
          user_uuid: userId,
          fee: 200,
        });
        if (feeErr) {
          console.error("[hook-cut] deduct_challenge_fee", feeErr);
          throw feeErr;
        }
        if (deducted !== true) {
          alert(t.challengeFeeFail);
          setUploadPhase(null);
          return;
        }

        const baseRow = {
          user_id: userId,
          fighter_name: fighterName.trim() || "未命名鬥士",
          genre: genre.trim() || "未指定",
          audio_path: storagePath,
          original_file_name: (songName.trim() || fileName).slice(0, 500),
          status: "waiting" as const,
        };

        let queueRows: { id: string }[] | null = null;
        let queueError: { message: string; code?: string; details?: string; hint?: string } | null = null;

        const withAi = { ...baseRow, ai_tool: aiTool.trim() || null };
        const res1 = await supabase.from("battle_queue").insert(withAi).select("id");
        queueError = res1.error;
        queueRows = res1.data;

        if (queueError) {
          const msg = `${queueError.message ?? ""} ${queueError.details ?? ""} ${queueError.hint ?? ""}`;
          const missingAiToolCol =
            /ai_tool|column.*does not exist|schema cache/i.test(msg) || queueError.code === "PGRST204";
          if (missingAiToolCol) {
            const res2 = await supabase.from("battle_queue").insert(baseRow).select("id");
            queueError = res2.error;
            queueRows = res2.data;
          }
        }

        if (queueError) {
          console.error("[hook-cut] battle_queue insert", queueError);
          throw queueError;
        }

        const first = queueRows?.[0];
        if (!first?.id) {
          console.error("[hook-cut] battle_queue insert returned no rows (check RLS / grants)", queueRows);
          throw new Error("queue insert returned no id — 請在 Supabase 執行 supabase/battle_queue_grants.sql 並確認 battle_queue RLS");
        }
        queueIdForNav = first.id;

        const { data: rpcRaw, error: rpcErr } = await supabase.rpc("attempt_matchmaking", {
          p_queue_id: queueIdForNav,
        });
        if (rpcErr) {
          console.error("[hook-cut] attempt_matchmaking", rpcErr);
          throw rpcErr;
        }
        const rpcRow = (Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw) as RpcQueueRow | null;
        console.log("[hook-cut] attempt_matchmaking result", rpcRow);

        const mmParams = new URLSearchParams({
          fighterName,
          songName,
          genre,
          aiTool,
          hookStart: start.toFixed(2),
          hookEnd: end.toFixed(2),
          hookDuration: (end - start).toFixed(2),
          lang,
          audioPath: storagePath,
          queueId: queueIdForNav,
        });
        if (coverUrl) mmParams.set("coverUrl", coverUrl);

        nextPath =
          rpcRow?.status === "matched" && rpcRow.match_group_id
            ? `/battle/${rpcRow.match_group_id}`
            : `/battle/matchmaking?${mmParams.toString()}`;
      } else {
        queueIdForNav = `mock-${Date.now()}`;
        const mmParams = new URLSearchParams({
          fighterName,
          songName,
          genre,
          aiTool,
          hookStart: start.toFixed(2),
          hookEnd: end.toFixed(2),
          hookDuration: (end - start).toFixed(2),
          lang,
          audioPath: storagePath,
          queueId: queueIdForNav,
        });
        if (coverUrl) mmParams.set("coverUrl", coverUrl);
        nextPath = `/battle/matchmaking?${mmParams.toString()}`;
      }

      setUploadPhase(t.success);

      setTimeout(() => {
        router.push(nextPath);
      }, 1200);
    } catch (err) {
      console.error("Upload failed:", err);
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      setUploadPhase(null);
      alert(`${t.uploadError}\n\n${msg.slice(0, 400)}`);
    }
  };

  const previewSelection = async () => {
    if (!isReady || isDecoding || !audioBufferRef.current) return;
    await playFromRegion();
  };

  const selectedDuration = Math.max(0, regionTimes.end - regionTimes.start);
  const isUploading = uploadPhase !== null;

  return (
    <div className="min-h-screen bg-black text-white p-8 selection:bg-orange-500/30 selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* 頂部列 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-orange-400">{t.title}</h1>
            <p className="text-zinc-400 mt-1 text-sm">{t.subtitle}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-right">
            <p className="text-xs text-zinc-500">{t.fighter}</p>
            <p className="font-bold text-orange-400">{fighterName}</p>
            <p className="text-xs text-zinc-500 mt-1">{t.song}: {songName}</p>
          </div>
        </div>

        {!audioUrl && (
          <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-16 text-center hover:border-orange-500 transition-colors">
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="hook-upload" />
            <label htmlFor="hook-upload" className="cursor-pointer block">
              <div className="text-7xl mb-6">🎵</div>
              <p className="text-2xl font-medium">{t.uploadPrompt}</p>
              <p className="text-zinc-500 mt-2 text-sm">{t.uploadHint}</p>
            </label>
          </div>
        )}

        {audioUrl && (
          <div className="space-y-10">
            {/* 波形 */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
              <div className="rounded-2xl overflow-hidden bg-zinc-800/60 ring-1 ring-zinc-700/70">
                <div ref={containerRef} />
              </div>

              {/* 選取資訊 */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-zinc-200">
                  <span className="font-semibold text-orange-300">{t.selection}</span>
                  {' '}
                  <span className="tabular-nums">
                    {formatTime(regionTimes.start)} - {formatTime(regionTimes.end)}
                  </span>
                  <span className="text-zinc-500">
                    {t.duration.replace('{s}', selectedDuration.toFixed(2))}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {t.dragHint}
                  {isPlaying && <span className="ml-2 text-orange-400">{t.playing}</span>}
                  {isDecoding && <span className="ml-2 text-zinc-400">{t.decording}</span>}
                </div>
              </div>

              {/* Mastering 開關 */}
              <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl bg-black/30 ring-1 ring-zinc-800 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{t.mastering}</div>
                  <div className="text-xs text-zinc-500">{t.masteringDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableMastering((v) => !v)}
                  className={[
                    'relative inline-flex h-9 w-16 items-center rounded-full transition',
                    enableMastering ? 'bg-orange-500' : 'bg-zinc-700',
                    'ring-1 ring-white/10',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60',
                  ].join(' ')}
                  aria-pressed={enableMastering}
                  aria-label={t.mastering}
                >
                  <span
                    className={[
                      'inline-block h-7 w-7 transform rounded-full bg-black shadow transition',
                      enableMastering ? 'translate-x-8' : 'translate-x-1',
                      'ring-1 ring-white/10',
                    ].join(' ')}
                  />
                </button>
              </div>

              <p className="text-center text-xs text-zinc-500 mt-5">{t.proTip}</p>
            </div>

            {/* 按鈕 */}
            <div className="flex gap-4">
              <button
                onClick={previewSelection}
                disabled={!isReady || isDecoding || !audioBufferRef.current || isUploading}
                className="flex-1 bg-white text-black font-bold py-6 rounded-3xl text-xl hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {t.preview}
              </button>

              <button
                onClick={handleConfirmUpload}
                disabled={!isReady || isDecoding || isUploading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 rounded-3xl text-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
              >
                {isUploading
                  ? `⏳ ${uploadPhase}`
                  : `✨ ${enableMastering ? t.masteringOn : t.masteringOff} + ${t.confirmUpload}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HookCutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-orange-400 text-sm tracking-widest">
        載入中…
      </div>
    }>
      <HookCutContent />
    </Suspense>
  );
}