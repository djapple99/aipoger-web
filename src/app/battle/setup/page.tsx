// src/app/battle/setup/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAuthBypassEnabled, mockUserId } from '@/lib/auth-bypass';
import { useI18n } from '@/lib/i18n';
import { AvatarCropUploadModal } from '@/components/avatar-crop-upload-modal';
import { readFighterNameFromStorage, writeFighterNameToStorage } from '@/lib/fighter-name-storage';

type GenreOption = { value: string; label: string };

const GENRES: GenreOption[] = [
  { value: '流行舞曲', label: '流行舞曲' },
  { value: '感人抒情', label: '感人抒情' },
  { value: '熱血搖滾', label: '熱血搖滾' },
  { value: '動感電音', label: '動感電音' },
  { value: '自我風格', label: '自我風格' },
];

const AI_TOOLS = [
  'Suno', 'Udio', 'Lyria', 'Mureka', 'AceStudio', 'MiniMax', 'ElevenLabs', '其他',
];

function imageContentType(file: File): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return map[ext] ?? 'image/jpeg';
}

const MAX_AVATAR_CROP_BYTES = 2 * 1024 * 1024;
const AVATAR_CROP_ACCEPT = 'image/jpeg,image/png,image/webp';

function isAllowedAvatarCropFile(file: File): boolean {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
}

export default function BattleSetupPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [fighterName, setFighterName] = useState('');
  const [songName, setSongName] = useState('');
  const [genre, setGenre] = useState('');
  const [aiTool, setAiTool] = useState('');
  const [otherTool, setOtherTool] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const cropFileInputRef = useRef<HTMLInputElement>(null);
  const avatarUploadSectionRef = useRef<HTMLDivElement>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadUserId, setUploadUserId] = useState<string | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUploadUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('fighterName');
      if (urlName) {
        try {
          setFighterName(decodeURIComponent(urlName.replace(/\+/g, ' ')));
        } catch {
          setFighterName(urlName);
        }
      }
      if (isAuthBypassEnabled) {
        if (!urlName) {
          const ls = readFighterNameFromStorage();
          if (ls) setFighterName(ls);
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('fighter_name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!urlName) {
          const fromDb = data?.fighter_name?.trim();
          if (fromDb) setFighterName(fromDb);
          else {
            const ls = readFighterNameFromStorage();
            if (ls) setFighterName(ls);
          }
        }
        if (typeof data?.avatar_url === 'string' && data.avatar_url.length > 0) {
          setProfileAvatarPreview(data.avatar_url);
        }
        return;
      }
      if (!urlName) {
        const ls = readFighterNameFromStorage();
        if (ls) setFighterName(ls);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#avatar-upload') return;
    const timer = window.setTimeout(() => {
      avatarUploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  // ── 頭像上傳 ──────────────────────────────────────────
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openCroppedProfileAvatar = () => {
    if (isAuthBypassEnabled) {
      alert('開發模式（AUTH_BYPASS）無法上傳至 Storage，請關閉後再試。');
      return;
    }
    if (!uploadUserId) {
      alert(t('setup_need_login'));
      router.push('/auth');
      return;
    }
    cropFileInputRef.current?.click();
  };

  const handleCropFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedAvatarCropFile(file)) {
      alert(t('avatar_invalid_type'));
      return;
    }
    if (file.size > MAX_AVATAR_CROP_BYTES) {
      alert(t('avatar_max_2mb'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // ── 封面圖上傳 ────────────────────────────────────────
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('封面圖片不能超過 5MB');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── 上傳檔案到 Supabase Storage ───────────────────────
  const uploadFile = async (file: File, userId: string, type: 'avatar' | 'cover'): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${type}.${ext}`;
    const contentType = imageContentType(file);

    const { error } = await supabase.storage
      .from('battle-audio')
      .upload(path, file, { upsert: true, contentType });

    if (error) {
      console.error(`Upload ${type} failed:`, error);
      return null;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('battle-audio')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1年有效期

    if (signErr) {
      console.error(`Signed URL ${type}:`, signErr);
      return null;
    }

    return signed?.signedUrl ?? null;
  };

  // ── 儲存 fighter_profile ──────────────────────────────
  const saveFighterProfile = async (
    userId: string,
    name: string,
    avatarUrl: string | null,
    coverUrl: string | null,
  ) => {
    await supabase.from('fighter_profiles').upsert(
      {
        id: userId,
        display_name: name,
        avatar_url: avatarUrl,
        song_cover_url: coverUrl,
      },
      { onConflict: 'id' },
    );
  };

  // ── 提交 ─────────────────────────────────────────────
  const handleSubmit = async () => {
    const finalAiTool = aiTool === '其他' ? otherTool.trim() : aiTool;

    if (!fighterName.trim() || !songName.trim() || !genre || !aiTool || (aiTool === '其他' && !finalAiTool)) {
      alert('請填寫所有必填欄位');
      return;
    }

    setUploading(true);
    setUploadProgress('準備上傳…');

    try {
      let userId: string;
      if (isAuthBypassEnabled) {
        userId = mockUserId;
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          alert(t('setup_need_login'));
          router.push('/auth');
          setUploading(false);
          return;
        }
        userId = session.user.id;
      }

      // 上傳頭像（略過遠端儲存：開發 bypass 無有效 JWT，無法通過 Storage RLS）
      let avatarUrl: string | null = null;
      if (avatarFile && !isAuthBypassEnabled) {
        setUploadProgress('上傳頭像…');
        avatarUrl = await uploadFile(avatarFile, userId, 'avatar');
        if (!avatarUrl) {
          alert(t('storage_upload_failed'));
          setUploading(false);
          return;
        }
      }

      let coverUrl: string | null = null;
      if (coverFile && !isAuthBypassEnabled) {
        setUploadProgress('上傳封面…');
        coverUrl = await uploadFile(coverFile, userId, 'cover');
        if (!coverUrl) {
          alert(t('storage_upload_failed'));
          setUploading(false);
          return;
        }
      }

      setUploadProgress('儲存資料…');

      if (!isAuthBypassEnabled) {
        await saveFighterProfile(userId, fighterName.trim(), avatarUrl, coverUrl);
        writeFighterNameToStorage(fighterName.trim());
        const { error: fnErr } = await supabase
          .from('user_profiles')
          .upsert({ id: userId, fighter_name: fighterName.trim() }, { onConflict: 'id' });
        if (fnErr) console.error('[setup] fighter_name upsert', fnErr);
      } else {
        writeFighterNameToStorage(fighterName.trim());
      }

      setUploadProgress('完成！即將進入 Hook 裁切…');

      // 正確：先去 hook-cut 裁切音檔
      const params = new URLSearchParams({
        fighterName: fighterName.trim(),
        songName: songName.trim(),
        genre,
        aiTool: finalAiTool,
      });
      if (coverUrl) params.set('coverUrl', coverUrl);
      router.push(`/battle/hook-cut?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert('上傳失敗，請稍後再試');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
      {/* 頂部標題 */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black tracking-tighter text-orange-400">🎤 鬥歌資料填寫</h1>
        <p className="text-zinc-400 mt-2 text-sm">填完後進入 Hook 裁切 → 配對 → 上場</p>
      </div>

      <div className="w-full max-w-2xl space-y-8">
        {/* 頭像 + 封面 雙上傳 */}
        <div className="grid grid-cols-2 gap-6">
          {/* 頭像 */}
          <div ref={avatarUploadSectionRef} id="avatar-upload" className="flex flex-col items-center gap-2">
            <label className="cursor-pointer group">
              <div className="relative">
                {profileAvatarPreview || avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(profileAvatarPreview ?? avatarPreview) as string}
                    alt="頭像"
                    className="w-36 h-36 rounded-full object-cover border-4 border-zinc-700 group-hover:border-orange-500 transition-all"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full border-4 border-dashed border-zinc-700 flex items-center justify-center group-hover:border-orange-500 transition-all">
                    <div className="text-center">
                      <div className="text-4xl mb-1">😎</div>
                      <div className="text-orange-400 text-xs font-medium">頭像</div>
                    </div>
                  </div>
                )}
                {/* 編輯標記 */}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm shadow-lg">✏️</div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            <p className="mt-2 text-xs text-zinc-500">{t('upload_avatar')}</p>
            <button
              type="button"
              onClick={openCroppedProfileAvatar}
              className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
            >
              {t('setup_avatar_upload_btn')}
            </button>
            <input ref={cropFileInputRef} type="file" accept={AVATAR_CROP_ACCEPT} className="hidden" onChange={handleCropFileChange} />
            {(profileAvatarPreview || avatarPreview) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                  setProfileAvatarPreview(null);
                }}
                className="mt-1 text-xs text-zinc-600 hover:text-red-400"
              >
                移除
              </button>
            )}
          </div>

          {/* 封面圖 */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer group">
              <div className="relative">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview}
                    alt="封面"
                    className="w-36 h-36 rounded-2xl object-cover border-4 border-zinc-700 group-hover:border-orange-500 transition-all shadow-lg"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl border-4 border-dashed border-zinc-700 flex items-center justify-center group-hover:border-orange-500 transition-all">
                    <div className="text-center">
                      <div className="text-4xl mb-1">🎵</div>
                      <div className="text-orange-400 text-xs font-medium">歌曲封面</div>
                    </div>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm shadow-lg">✏️</div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
            <p className="mt-2 text-xs text-zinc-500">上傳歌曲封面（可選）</p>
            {coverPreview && (
              <button
                type="button"
                onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                className="mt-1 text-xs text-zinc-600 hover:text-red-400"
              >
                移除
              </button>
            )}
          </div>
        </div>

        {/* 表單欄位 */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 space-y-6 backdrop-blur">
          {/* 鬥士名稱 */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">鬥士名稱 *</label>
            <input
              type="text"
              value={fighterName}
              onChange={(e) => setFighterName(e.target.value)}
              placeholder="例如：夜色迴響"
              maxLength={30}
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* 歌曲名稱 */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">歌曲名稱 *</label>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              placeholder="輸入你的歌曲名稱"
              maxLength={60}
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* 歌曲種類 */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">歌曲種類 *</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">請選擇種類</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* AI 工具 */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">使用什麼 AI 工具製作 *</label>
            <select
              value={aiTool}
              onChange={(e) => setAiTool(e.target.value)}
              className="w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="">請選擇 AI 工具</option>
              {AI_TOOLS.map((tool) => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>
            {aiTool === '其他' && (
              <input
                type="text"
                value={otherTool}
                onChange={(e) => setOtherTool(e.target.value)}
                placeholder="請輸入使用的 AI 工具名稱"
                className="mt-3 w-full bg-zinc-800/80 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
              />
            )}
          </div>
        </div>

        {/* 提示 */}
        <p className="text-center text-xs text-zinc-600">
          * 為必填欄位 · 頭像與封面將用於唱片顯示
        </p>

        {/* 送出按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-black font-bold py-6 text-xl rounded-3xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
        >
          {uploading ? `⏳ ${uploadProgress}` : '🚀 開始 Hook 裁切 →'}
        </button>
      </div>

      {uploadUserId ? (
        <AvatarCropUploadModal
          open={cropModalOpen}
          imageDataUrl={cropImageSrc}
          userId={uploadUserId}
          onClose={() => {
            setCropModalOpen(false);
            setCropImageSrc(null);
          }}
          onUploaded={(url) => {
            setProfileAvatarPreview(url);
            setAvatarPreview(url);
            setAvatarFile(null);
            alert(t('avatar_crop_success'));
          }}
        />
      ) : null}
    </div>
  );
}