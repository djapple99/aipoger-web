// src/app/battle/setup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BattleSetupPage() {
  const router = useRouter();

  const [avatar, setAvatar] = useState<string | null>(null);
  const [fighterName, setFighterName] = useState('');
  const [songName, setSongName] = useState('');
  const [genre, setGenre] = useState('');
  const [aiTool, setAiTool] = useState('');
  const [otherTool, setOtherTool] = useState('');

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    const finalAiTool = aiTool === '其他' ? otherTool.trim() : aiTool;

    if (!fighterName.trim() || !songName.trim() || !genre || !aiTool || (aiTool === '其他' && !finalAiTool)) {
      alert('請填寫所有必填欄位');
      return;
    }

    console.log('✅ 送出資料：', {
      fighterName: fighterName.trim(),
      songName: songName.trim(),
      genre,
      aiTool: finalAiTool,
    });

    // 跳轉到 Hook 裁切頁面，並用 query 帶上表單資料
    const params = new URLSearchParams({
      fighterName: fighterName.trim(),
      songName: songName.trim(),
      genre,
      aiTool: finalAiTool,
    });
    router.push(`/battle/hook-cut?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-orange-400">鬥歌資料填寫</h1>
          <p className="text-zinc-400 mt-2">先填寫資料，下一步會進入 Hook 裁切</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 space-y-10">
          {/* 頭像上傳 */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer">
              <div className="w-40 h-40 rounded-full border-4 border-orange-500 overflow-hidden bg-zinc-800 flex items-center justify-center hover:scale-105 transition">
                {avatar ? (
                  <img src={avatar} alt="頭像" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-2">📸</div>
                    <div className="text-orange-400 text-sm font-medium">上傳頭像</div>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="space-y-6">
            {/* 鬥士名稱 */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">鬥士名稱</label>
              <input
                type="text"
                value={fighterName}
                onChange={(e) => setFighterName(e.target.value)}
                placeholder="例如：夜色迴響"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* 歌曲名稱 */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">歌曲名稱</label>
              <input
                type="text"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="輸入你的歌曲名稱"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* 歌曲種類 */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">歌曲種類</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">請選擇種類</option>
                <option value="流行舞曲">流行舞曲</option>
                <option value="感人抒情">感人抒情</option>
                <option value="熱血搖滾">熱血搖滾</option>
                <option value="動感電音">動感電音</option>
                <option value="自我風格">自我風格</option>
              </select>
            </div>

            {/* 使用什麼 AI 工具製作 */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">使用什麼 AI 工具製作</label>
              <select
                value={aiTool}
                onChange={(e) => setAiTool(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">請選擇 AI 工具</option>
                <option value="Suno">Suno</option>
                <option value="Udio">Udio</option>
                <option value="Lyria">Lyria</option>
                <option value="Mureka">Mureka</option>
                <option value="AceStudio">AceStudio</option>
                <option value="MiniMax">MiniMax</option>
                <option value="ElevenLabs">ElevenLabs</option>
                <option value="其他">其他（自行填寫）</option>
              </select>

              {aiTool === '其他' && (
                <input
                  type="text"
                  value={otherTool}
                  onChange={(e) => setOtherTool(e.target.value)}
                  placeholder="請輸入使用的 AI 工具名稱"
                  className="mt-3 w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500"
                />
              )}
            </div>
          </div>

          {/* 送出按鈕 */}
          <button
            onClick={handleSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-xl rounded-3xl transition"
          >
            開始 Hook 裁切 →
          </button>
        </div>
      </div>
    </div>
  );
}