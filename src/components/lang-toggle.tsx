'use client';

import { useI18n } from '@/lib/i18n';

export default function LangToggle() {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === 'zh' ? 'Switch to English' : '切換到中文'}
      className="fixed right-4 top-4 z-50 rounded-full border border-zinc-600 bg-black/60 px-3 py-1.5 text-xs font-bold tracking-widest backdrop-blur transition hover:border-orange-500 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
}