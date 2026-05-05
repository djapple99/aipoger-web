export const dynamic = 'force-dynamic';
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AuthContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-24">
      <div className="z-10 w-full max-w-md items-center justify-between text-sm">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          AIPOGER 鬥士登入
        </h1>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md mb-6 text-center">
            認證發生錯誤，請重試。
          </div>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-[#a1a1aa] text-center mb-4">
            點擊登入即代表您同意愛播歌的免責聲明與版權規範。
          </p>
          <button 
            className="bg-white text-black hover:bg-[#ff6a00] hover:text-white transition-colors py-3 px-6 rounded-md font-bold text-lg"
            onClick={() => window.location.href = '/'}
          >
            以測試帳號進入
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-[#ff6a00]">載入中...</div>}>
      <AuthContent />
    </Suspense>
  );
}