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
      ? 'aipo-ghost-button inline-flex h-10 min-w-14 shrink-0 items-center justify-center rounded-full px-3 text-xs font-black tracking-widest text-zinc-100 backdrop-blur transition hover:text-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      : 'aipo-ghost-button fixed right-4 top-4 z-50 inline-flex h-10 min-w-14 items-center justify-center rounded-full px-3 text-xs font-black tracking-widest text-zinc-100 shadow-[0_14px_38px_rgba(0,0,0,0.36)] backdrop-blur transition hover:text-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

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
