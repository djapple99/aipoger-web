'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  /** fixed：全站右上角（非首頁）；inline：嵌入首頁頂欄，不擋登入與 AIPO Coin */
  variant?: 'fixed' | 'inline';
};

export default function LangToggle({ variant = 'fixed' }: Props) {
  const { lang, toggleLang } = useI18n();
  const nextLabel = {
    zh: 'EN',
    en: 'JP',
    ja: 'KR',
    ko: '中',
  }[lang];

  const className =
    variant === 'inline'
      ? 'inline-flex h-10 min-w-14 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-950/90 px-3 text-xs font-bold tracking-widest text-zinc-200 shadow-lg backdrop-blur transition hover:border-orange-500 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      : 'fixed right-4 top-4 z-50 inline-flex h-10 min-w-14 items-center justify-center rounded-full border border-zinc-600 bg-black/70 px-3 text-xs font-bold tracking-widest text-zinc-200 shadow-[0_14px_38px_rgba(0,0,0,0.36)] backdrop-blur transition hover:border-orange-500 hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label="Switch language"
      className={className}
      title="Switch language"
    >
      {nextLabel}
    </button>
  );
}
