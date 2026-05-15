'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  /** fixed：全站右上角（非首頁）；inline：嵌入首頁頂欄，不擋登入與 AIPO Coin */
  variant?: 'fixed' | 'inline';
};

export default function LangToggle({ variant = 'fixed' }: Props) {
  const { lang, toggleLang } = useI18n();

  const className =
    variant === 'inline'
      ? 'shrink-0 rounded-full border border-zinc-600 bg-zinc-950/90 px-3 py-2 text-xs font-bold tracking-widest text-zinc-200 shadow-lg backdrop-blur transition hover:border-orange-500 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'
      : 'fixed right-4 top-4 z-50 rounded-full border border-zinc-600 bg-black/60 px-3 py-1.5 text-xs font-bold tracking-widest backdrop-blur transition hover:border-orange-500 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500';

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === 'zh' ? 'Switch to English' : '切換到中文'}
      className={className}
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
}
