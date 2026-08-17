'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AIPOGER_BRAND_LOGO } from '@/lib/brand';
import { useI18n } from '@/lib/i18n';

const BATTLE_FIXED_ROUTES = ['setup', 'hook-cut', 'matchmaking'];

export default function NavHomeLink() {
  const { t } = useI18n();
  const pathname = usePathname();
  /** 僅擂台單場（/battle/:id）；排除列表與固定子路徑 */
  const seg = pathname?.match(/^\/battle\/([^/]+)$/)?.[1];
  const isBattleArena = Boolean(seg && !BATTLE_FIXED_ROUTES.includes(seg));
  if (!pathname || pathname === '/') return null;

  const linkClassName = isBattleArena
    ? 'fixed left-2 top-2 z-50 rounded-2xl bg-black/68 p-1 ring-1 ring-orange-300/25 backdrop-blur transition hover:bg-black/78 sm:left-3 sm:top-3'
    : 'fixed left-4 top-4 z-50 rounded-3xl bg-black/40 p-2 ring-1 ring-white/10 backdrop-blur transition hover:bg-black/55';
  const logoClassName = isBattleArena ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-11 w-11';
  const logoSize = isBattleArena ? 36 : 44;

  return (
    <Link
      href="/"
      aria-label={t('nav_home_aria')}
      className={linkClassName}
    >
      <Image
        src={AIPOGER_BRAND_LOGO}
        alt={t('home_logo_alt')}
        width={logoSize}
        height={logoSize}
        priority
        className={logoClassName}
      />
    </Link>
  );
}
