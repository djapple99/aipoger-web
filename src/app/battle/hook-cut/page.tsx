// src/app/battle/hook-cut/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';

const MAX_HOOK_SECONDS = 45;
const MIN_REGION_SECONDS = 0.25;

type RegionTimes = { start: number; end: number };

export default function HookCutPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [enableMastering, setEnableMastering] = useState(true);
  const [regionTimes, setRegionTimes] = useState<RegionTimes>({ start: 0, end: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<any>(null);
  const durationRef = useRef<number>(0);
  const lastRegionRef = useRef<RegionTimes | null>(null);

  // Web Audio mastering/playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const playWindowRef = useRef<RegionTimes | null>(null);
  const playStartedAtRef = useRef<number>(0); // audioCtx.currentTime when started
  const playOffsetRef = useRef<number>(0); // seconds offset into buffer when started

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
      try {
        src.onended = null;
        src.stop();
      } catch {
        // ignore
      }
      try {
        src.disconnect();
      } catch {
        // ignore
      }
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

    // Mastering chain: Compressor + Gain
    let out: AudioNode = src;
    if (enableMastering) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.18;

      const gain = ctx.createGain();
      // +1 dB ≈ 10^(1/20) = 1.122018...
      gain.gain.value = Math.pow(10, 1 / 20);

      out.connect(comp);
      comp.connect(gain);
      out = gain;
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

  // 上傳音檔
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

  // 初始化 WaveSurfer + Regions（波形 + 選取框拖曳）
  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch {
        // ignore
      }
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
        // Selected region tint (gray) for clarity on dark UI
        color: 'rgba(228, 228, 231, 0.22)', // zinc-200 @ 22%
        drag: true,
        resize: true,
      });

      regionRef.current = region;
      lastRegionRef.current = { start: region.start, end: region.end };
      setRegionTimes({ start: region.start, end: region.end });
      setIsReady(true);

      region.on('update', () => {
        const prev = lastRegionRef.current;
        if (!prev) {
          lastRegionRef.current = { start: region.start, end: region.end };
          return;
        }

        const rawStart = region.start;
        const rawEnd = region.end;
        let start = rawStart;
        let end = rawEnd;

        const startChanged = Math.abs(rawStart - prev.start) > 0.001;
        const endChanged = Math.abs(rawEnd - prev.end) > 0.001;
        const duration = durationRef.current || 0;

        start = Math.max(0, start);
        end = Math.min(duration, end);

        if (end - start > MAX_HOOK_SECONDS) {
          if (startChanged && !endChanged) start = end - MAX_HOOK_SECONDS;
          else if (endChanged && !startChanged) end = start + MAX_HOOK_SECONDS;
          else end = start + MAX_HOOK_SECONDS;
        }

        if (end - start < MIN_REGION_SECONDS) {
          if (startChanged && !endChanged) start = end - MIN_REGION_SECONDS;
          else end = start + MIN_REGION_SECONDS;
        }

        if (start < 0) {
          const shift = -start;
          start = 0;
          end = Math.min(duration, end + shift);
        }
        if (end > duration) {
          const shift = end - duration;
          end = duration;
          start = Math.max(0, start - shift);
        }

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
      try {
        ws.destroy();
      } catch {
        // ignore
      } finally {
        if (wavesurferRef.current === ws) wavesurferRef.current = null;
      }
    };
  }, [audioUrl]);

  // Spacebar: play/pause from region start to end (honor mastering)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      if (!isReady) return;
      if (!audioBufferRef.current) return;

      e.preventDefault();
      if (isPlaying) stopPlayback();
      else void playFromRegion();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReady, isPlaying, enableMastering]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) void ctx.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewSelection = async () => {
    if (!isReady || isDecoding || !audioBufferRef.current) return;
    await playFromRegion();
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 selection:bg-orange-500/30 selection:text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-orange-400 text-center mb-1">Hook 裁切</h1>
        <p className="text-zinc-400 text-center mb-10">最多 45 秒 • 系統會自動 Mastering 美化聲音</p>

        {!audioUrl && (
          <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-16 text-center">
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="hook-upload" />
            <label htmlFor="hook-upload" className="cursor-pointer block">
              <div className="text-7xl mb-6">🎵</div>
              <p className="text-2xl font-medium">上傳完整歌曲</p>
              <p className="text-zinc-500 mt-2">拖曳波形選擇 Hook</p>
            </label>
          </div>
        )}

        {audioUrl && (
          <div className="space-y-10">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
              <div className="rounded-2xl overflow-hidden bg-zinc-800/60 ring-1 ring-zinc-700/70">
                <div ref={containerRef} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-zinc-200">
                  <span className="font-semibold text-orange-300">選取</span>{' '}
                  <span className="tabular-nums">
                    {formatTime(regionTimes.start)} - {formatTime(regionTimes.end)}
                  </span>
                  <span className="text-zinc-500">（{Math.max(0, regionTimes.end - regionTimes.start).toFixed(2)}s）</span>
                </div>
                <div className="text-xs text-zinc-500">
                  拖左/右邊緣調整長度（最多 45 秒） • 拖中間移動 • 空白鍵預覽/暫停（從選取起點）
                  {isPlaying ? <span className="ml-2 text-orange-400">播放中</span> : null}
                  {isDecoding ? <span className="ml-2 text-zinc-400">解析音檔中…</span> : null}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl bg-black/30 ring-1 ring-zinc-800 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">啟用自動 Mastering</div>
                  <div className="text-xs text-zinc-500">Compressor + Gain 提升清晰度與響度</div>
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
                  aria-label="啟用自動 Mastering"
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

              <p className="text-center text-xs text-zinc-500 mt-5">專業模式：拖曳中即時硬限制 45 秒（超過會自動彈回）</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={previewSelection}
                disabled={!isReady || isDecoding || !audioBufferRef.current}
                className="flex-1 bg-white text-black font-bold py-6 rounded-3xl text-xl hover:bg-zinc-200 transition disabled:opacity-50"
              >
                ▶️ 即時預覽選取區間
              </button>

              <button
                onClick={() => alert('🎉 上傳 Hook 功能開發中')}
                disabled={!isReady || isDecoding}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 rounded-3xl text-xl transition disabled:opacity-50"
              >
                ✨ {enableMastering ? '自動 Mastering' : '原始音檔'} + 確認上傳
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}