// src/app/battle/hook-cut/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

export default function HookCutPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(30);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const maxDuration = 45;
  const isDragging = useRef<'left' | 'right' | 'move' | null>(null);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  // 上傳音檔
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setStartTime(0);
      setDuration(30);
    }
  };

  // 繪製波形 + 高亮框
  const drawWaveform = async () => {
    if (!audioUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    const totalDuration = audioBuffer.duration || 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景波形
    ctx.fillStyle = '#4b5563';
    for (let i = 0; i < canvas.width; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    // 高亮選取框
    const startPercent = startTime / totalDuration;
    const endPercent = Math.min((startTime + duration) / totalDuration, 1);
    const startX = startPercent * canvas.width;
    const endX = endPercent * canvas.width;

    ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.fillRect(startX, 0, endX - startX, canvas.height);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(startX, 0, endX - startX, canvas.height);

    // 左把手
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(startX - 14, 0, 28, canvas.height);
    // 右把手
    ctx.fillRect(endX - 14, 0, 28, canvas.height);
  };

  // 拖曳判斷
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const totalWidth = rect.width;
    const totalDuration = audioRef.current.duration || 1;

    const startX = (startTime / totalDuration) * totalWidth;
    const endX = ((startTime + duration) / totalDuration) * totalWidth;

    if (Math.abs(clickX - startX) < 35) isDragging.current = 'left';
    else if (Math.abs(clickX - endX) < 35) isDragging.current = 'right';
    else if (clickX > startX && clickX < endX) {
      isDragging.current = 'move';
      dragStartX.current = clickX;
      dragStartValue.current = startTime;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || !canvasRef.current || !audioRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const totalWidth = rect.width;
    const totalDuration = audioRef.current.duration || 1;
    const clickTime = (clickX / totalWidth) * totalDuration;

    if (isDragging.current === 'left') {
      setStartTime(Math.max(0, clickTime));
    } else if (isDragging.current === 'right') {
      const newDuration = Math.min(maxDuration, clickTime - startTime);
      setDuration(Math.max(10, newDuration));
    } else if (isDragging.current === 'move') {
      const delta = (clickX - dragStartX.current) / totalWidth * totalDuration;
      const newStart = Math.max(0, dragStartValue.current + delta);
      setStartTime(newStart);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = null;
  };

  // 即時預覽
  const previewSelection = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = startTime;
    audioRef.current.play();

    const stopAt = startTime + duration;
    const timer = setInterval(() => {
      if (audioRef.current && audioRef.current.currentTime >= stopAt) {
        audioRef.current.pause();
        clearInterval(timer);
      }
    }, 50);
  };

  // 空白鍵
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && audioRef.current) {
        e.preventDefault();
        audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // 重繪
  useEffect(() => {
    if (audioUrl) drawWaveform();
  }, [audioUrl, startTime, duration]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-orange-400 text-center mb-1">Hook 裁切</h1>
        <p className="text-zinc-400 text-center mb-10">最多 45 秒 • 系統會自動 Mastering 美化聲音</p>

        {!audioUrl && (
          <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-16 text-center">
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" id="hook-upload" />
            <label htmlFor="hook-upload" className="cursor-pointer block">
              <div className="text-7xl mb-6">🎵</div>
              <p className="text-2xl font-medium">上傳完整歌曲</p>
              <p className="text-zinc-500 mt-2">在波形上拖曳選擇 Hook</p>
            </label>
          </div>
        )}

        {audioUrl && (
          <div className="space-y-10">
            <audio ref={audioRef} src={audioUrl} controls className="w-full" />

            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
              <canvas
                ref={canvasRef}
                width={1000}
                height={220}
                className="w-full cursor-pointer rounded-2xl bg-black"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              <p className="text-center text-xs text-zinc-500 mt-3">
                拖左邊線調整開始 • 拖右邊線調整長度 • 拖中間移動區間 • 空白鍵播放/暫停
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={previewSelection}
                className="flex-1 bg-white text-black font-bold py-6 rounded-3xl text-xl hover:bg-zinc-200 transition"
              >
                ▶️ 即時預覽選取區間
              </button>

              <button
                onClick={() => alert('🎉 自動 Mastering + 上傳 Hook 功能開發中')}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 rounded-3xl text-xl transition"
              >
                ✨ 自動 Mastering + 確認上傳
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}