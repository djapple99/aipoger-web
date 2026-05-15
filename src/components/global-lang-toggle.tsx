'use client';

import { usePathname } from 'next/navigation';
import LangToggle from '@/components/lang-toggle';

/** 首頁頂欄自行放置語系按鈕，其餘頁面用固定右上角 */
export default function GlobalLangToggle() {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <LangToggle variant="fixed" />;
}
