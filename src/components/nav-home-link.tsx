'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function NavHomeLink() {
  const { t } = useI18n();

  return (
    <Link
      href="/"
      aria-label={t('nav_home_aria')}
      className="fixed left-4 top-4 z-50 rounded-3xl bg-black/40 p-2 ring-1 ring-white/10 backdrop-blur hover:bg-black/55 transition"
    >
      <Image
        src="/aipoger-logo.png"
        alt={t('home_logo_alt')}
        width={44}
        height={44}
        priority
        className="h-11 w-11"
      />
    </Link>
  );
}
