'use client';

import { usePathname } from 'next/navigation';
import LangToggle from '@/components/lang-toggle';

/** 首頁頂欄自行放置語系按鈕，其餘頁面用固定右上角 */
export default function GlobalLangToggle() {
  const pathname = usePathname();
  if (!pathname || pathname === '/') return null;
  const battleArenaMatch = pathname.match(/^\/battle\/([^/]+)$/);
  const battlePanelIds = ['setup', 'hook-cut', 'matchmaking'];
  const routesWithLocalLangToggle = new Set([
    '/admin/battles',
    '/admin/listen-bar',
    '/listen-bar',
    '/music-analysis',
  ]);
  const hideFixedLangOnArena =
    Boolean(battleArenaMatch && !battlePanelIds.includes(battleArenaMatch[1]));
  const hasLocalLangToggle = [...routesWithLocalLangToggle].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (hideFixedLangOnArena || hasLocalLangToggle) return null;
  return <LangToggle variant="fixed" />;
}
