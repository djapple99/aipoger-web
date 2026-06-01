"use client";

import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

const MAX_HOOK_SECONDS = 45;

type HookCropperProps = {
  file: File;
  onBack: () => void;
  onConfirm: (payload: {
    blob: Blob;
    start: number;
    end: number;
    duration: number;
  }) => Promise<void> | void;
};

type WaveRegion = {
  start: number;
  end: number;
  setOptions: (options: { start?: number; end?: number }) => void;
};

function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataLength = audioBuffer.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  let offset = 0;
  writeString(offset, "RIFF");
  offset += 4;
  view.setUint32(offset, 36 + dataLength, true);
  offset += 4;
  writeString(offset, "WAVE");
  offset += 4;
  writeString(offset, "fmt ");
  offset += 4;
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, format, true);
  offset += 2;
  view.setUint16(offset, numberOfChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;
  writeString(offset, "data");
  offset += 4;
  view.setUint32(offset, dataLength, true);
  offset += 4;

  const channels = Array.from({ length: numberOfChannels }, (_, channel) =>
    audioBuffer.getChannelData(channel),
  );

  let sampleOffset = offset;
  for (let frame = 0; frame < audioBuffer.length; frame += 1) {
    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(sampleOffset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      sampleOffset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function estimateIntegratedLufs(audioBuffer: AudioBuffer): Promise<number> {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  // Approximate ITU-R BS.1770 K-weighting using high-pass + high-shelf.
  const highPass = offlineContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 38;
  highPass.Q.value = 0.5;

  const highShelf = offlineContext.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = 1500;
  highShelf.gain.value = 4;

  source.connect(highPass);
  highPass.connect(highShelf);
  highShelf.connect(offlineContext.destination);

  source.start(0);
  const weightedBuffer = await offlineContext.startRendering();

  let weightedPower = 0;
  for (let channel = 0; channel < weightedBuffer.numberOfChannels; channel += 1) {
    const data = weightedBuffer.getChannelData(channel);
    let channelPower = 0;
    for (let index = 0; index < data.length; index += 1) {
      const sample = data[index];
      channelPower += sample * sample;
    }
    channelPower /= Math.max(1, data.length);
    weightedPower += channelPower;
  }

  weightedPower /= Math.max(1, weightedBuffer.numberOfChannels);
  const safePower = Math.max(weightedPower, 1e-12);

  // LUFS approximation with BS.1770 offset.
  return -0.691 + 10 * Math.log10(safePower);
}

async function trimAudioToHook(file: File, start: number, end: number): Promise<Blob> {
  const audioContext = new AudioContext();
  try {
    const sourceArrayBuffer = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(sourceArrayBuffer);
    const sampleRate = decoded.sampleRate;
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const frameCount = Math.max(1, endSample - startSample);
    const trimmedBuffer = audioContext.createBuffer(decoded.numberOfChannels, frameCount, sampleRate);

    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const sourceChannel = decoded.getChannelData(channel).slice(startSample, endSample);
      trimmedBuffer.copyToChannel(sourceChannel, channel, 0);
    }

    // Loudness normalization (LUFS-oriented) for more consistent perceived volume.
    const targetLufs = -14;
    const measuredLufs = await estimateIntegratedLufs(trimmedBuffer);
    const gainLinear = Math.pow(10, (targetLufs - measuredLufs) / 20);

    for (let channel = 0; channel < trimmedBuffer.numberOfChannels; channel += 1) {
      const data = trimmedBuffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        data[index] *= gainLinear;
      }
    }

    // Peak safety pass to avoid clipping after loudness gain.
    let peak = 0;
    for (let channel = 0; channel < trimmedBuffer.numberOfChannels; channel += 1) {
      const data = trimmedBuffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        const amplitude = Math.abs(data[index]);
        if (amplitude > peak) {
          peak = amplitude;
        }
      }
    }

    if (peak > 0) {
      const targetPeak = 0.98;
      if (peak > targetPeak) {
        const safetyGain = targetPeak / peak;
        for (let channel = 0; channel < trimmedBuffer.numberOfChannels; channel += 1) {
          const data = trimmedBuffer.getChannelData(channel);
          for (let index = 0; index < data.length; index += 1) {
            data[index] *= safetyGain;
          }
        }
      }
    }

    return encodeWavFromAudioBuffer(trimmedBuffer);
  } finally {
    await audioContext.close();
  }
}

export function HookCropper({ file, onBack, onConfirm }: HookCropperProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<WaveRegion | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regionStart, setRegionStart] = useState(0);
  const [regionEnd, setRegionEnd] = useState(0);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    const setupWaveform = async () => {
      if (!waveformRef.current) return;

      const [{ default: WaveSurfer }, { default: RegionsPlugin }] = await Promise.all([
        import("wavesurfer.js"),
        import("wavesurfer.js/dist/plugins/regions.esm.js"),
      ]);

      objectUrl = URL.createObjectURL(file);
      const regions = RegionsPlugin.create();
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#ff8d40",
        progressColor: "#ffd7be",
        cursorColor: "#f7ede7",
        height: 140,
        normalize: true,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        url: objectUrl,
        plugins: [regions],
      });

      wavesurferRef.current = wavesurfer;
      wavesurfer.on("ready", () => {
        if (!mounted) return;
        const duration = wavesurfer.getDuration();
        const initialEnd = Math.min(duration, MAX_HOOK_SECONDS);
        regionRef.current = regions.addRegion({
          start: 0,
          end: initialEnd,
          drag: true,
          resize: true,
          color: "rgba(255, 141, 64, 0.25)",
        });
        setRegionStart(0);
        setRegionEnd(initialEnd);
        setIsReady(true);
      });

      wavesurfer.on("play", () => setIsPlaying(true));
      wavesurfer.on("pause", () => setIsPlaying(false));

      regions.on("region-updated", (region: WaveRegion) => {
        const duration = wavesurfer.getDuration();
        let start = Math.max(0, region.start);
        let end = Math.min(duration, region.end);

        if (end - start > MAX_HOOK_SECONDS) {
          if (region.end > region.start) {
            end = start + MAX_HOOK_SECONDS;
          } else {
            start = end - MAX_HOOK_SECONDS;
          }
          region.setOptions({ start, end });
        }

        setRegionStart(start);
        setRegionEnd(end);
      });
    };

    setupWaveform().catch(() => {
      setErrorMessage("波形初始化失敗，請重新選擇檔案。");
    });

    return () => {
      mounted = false;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file]);

  const playRegion = () => {
    const wavesurfer = wavesurferRef.current;
    const region = regionRef.current;
    if (!wavesurfer || !region) return;
    wavesurfer.play(region.start, region.end);
  };

  const handleConfirm = async () => {
    try {
      setIsExporting(true);
      setErrorMessage(null);
      const clipBlob = await trimAudioToHook(file, regionStart, regionEnd);
      await onConfirm({
        blob: clipBlob,
        start: regionStart,
        end: regionEnd,
        duration: regionEnd - regionStart,
      });
    } catch {
      setErrorMessage("裁切或上傳失敗，請再試一次。");
      setIsExporting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#4d5258] bg-[#1f2226]/90 p-6 md:p-8">
      <p className="text-xs tracking-[0.38em] text-[#8f847e]">AIPOGER</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[0.16em] text-[#f4f0ed]">最強抓波Drop Battle 裁切工具</h2>
      <p className="mt-3 text-sm text-[#cfc7c2]">拖曳橘色區塊選取 Drop（最多 45 秒），先預聽再確認上傳。</p>

      <div className="mt-6 rounded-2xl border border-[#3f444b] bg-[#24282d] p-4">
        <div ref={waveformRef} className="w-full overflow-hidden rounded-lg bg-[#2b2f34] px-2 py-4" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-[#d9d2cc] md:grid-cols-3">
        <p>開始：{regionStart.toFixed(2)}s</p>
        <p>結束：{regionEnd.toFixed(2)}s</p>
        <p>長度：{Math.max(0, regionEnd - regionStart).toFixed(2)}s / 45s</p>
      </div>

      {errorMessage && <p className="mt-4 text-sm text-[#ffba92]">{errorMessage}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-[#5d636a] px-4 py-2 text-sm tracking-[0.1em] text-[#ddd6d1] transition hover:border-[#ff8d40] hover:text-[#ffd6bd]"
        >
          返回修改資料
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={() => wavesurferRef.current?.playPause()}
          className="rounded-xl border border-[#6f757c] bg-gradient-to-b from-[#626870] to-[#4a5057] px-4 py-2 text-sm tracking-[0.1em] text-[#f7f1ed] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.42)] disabled:opacity-50"
        >
          {isPlaying ? "暫停" : "播放全曲"}
        </button>
        <button
          type="button"
          disabled={!isReady}
          onClick={playRegion}
          className="rounded-xl border border-[#6f757c] bg-gradient-to-b from-[#626870] to-[#4a5057] px-4 py-2 text-sm tracking-[0.1em] text-[#f7f1ed] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.42)] disabled:opacity-50"
        >
          預聽 Drop
        </button>
        <button
          type="button"
          disabled={!isReady || isExporting}
          onClick={handleConfirm}
          className="rounded-xl border border-[#767c83] bg-gradient-to-b from-[#666c73] to-[#4a5057] px-4 py-2 text-sm font-semibold tracking-[0.12em] text-[#f8f3ef] transition hover:border-[#ff8d40] hover:shadow-[0_0_18px_rgba(255,121,40,0.45)] disabled:opacity-60"
        >
          {isExporting ? "裁切上傳中..." : "確認 Drop 並上傳"}
        </button>
      </div>
    </section>
  );
}
