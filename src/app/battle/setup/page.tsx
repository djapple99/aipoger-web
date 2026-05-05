"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { HookCropper } from "@/components/hook-cropper";
import { isAuthBypassEnabled, mockUserId } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";

const genres = ["流行", "抒情", "搖滾", "電音", "自創"] as const;

export default function BattleSetupPage() {
  const router = useRouter();
  const [fighterName, setFighterName] = useState("");
  const [genre, setGenre] = useState<(typeof genres)[number]>("流行");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);

  useEffect(() => {
    if (isAuthBypassEnabled) return;

    const ensureSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth?intent=battle");
      }
    };
    ensureSession();
  }, [router]);

  const handleGoCropper = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!fighterName.trim()) {
      setErrorMessage("請輸入鬥士名稱。");
      return;
    }

    if (!songFile) {
      setErrorMessage("請先上傳音樂檔案。");
      return;
    }

    setIsCropMode(true);
  };

  const handleConfirmCrop = async (payload: {
    blob: Blob;
    start: number;
    end: number;
    duration: number;
  }) => {
    if (!songFile) return;

    setIsSubmitting(true);

    try {
      const safeFileName = songFile.name.replace(/\s+/g, "-").replace(/\.[^/.]+$/, "");
      const hookFileName = `${safeFileName}-hook.wav`;
      let filePath = `${mockUserId}/${Date.now()}-${hookFileName}`;
      let queueId = `mock-${crypto.randomUUID()}`;
      if (!isAuthBypassEnabled) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth?intent=battle");
          return;
        }

        filePath = `${user.id}/${Date.now()}-${hookFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("battle-audio")
          .upload(filePath, payload.blob, {
            upsert: false,
            contentType: "audio/wav",
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: queueRow, error: queueError } = await supabase
          .from("battle_queue")
          .insert({
            user_id: user.id,
            fighter_name: fighterName.trim(),
            genre,
            audio_path: filePath,
            original_file_name: hookFileName,
            status: "waiting",
          })
          .select("id")
          .single<{ id: string }>();

        if (queueError || !queueRow) {
          throw queueError ?? new Error("建立配對佇列失敗");
        }

        queueId = queueRow.id;
      }

      const params = new URLSearchParams({
        fighterName: fighterName.trim(),
        genre,
        fileName: songFile.name,
        audioPath: filePath,
        queueId,
        hookStart: payload.start.toFixed(2),
        hookEnd: payload.end.toFixed(2),
        hookDuration: payload.duration.toFixed(2),
      });

      router.push(`/battle/matchmaking?${params.toString()}`);
    } catch (error) {
      const fallbackMessage = "音樂上傳失敗，請稍後重試。";
      setErrorMessage(error instanceof Error ? error.message || fallbackMessage : fallbackMessage);
      setIsSubmitting(false);
      setIsCropMode(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#16181b] text-[#efebe8]">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
        {isCropMode && songFile ? (
          <HookCropper
            file={songFile}
            onBack={() => {
              if (isSubmitting) return;
              setIsCropMode(false);
            }}
            onConfirm={handleConfirmCrop}
          />
        ) : (
          <section className="rounded-3xl border border-[#4d5258] bg-[#1f2226]/90 p-6 md:p-8">
          <p className="text-xs tracking-[0.38em] text-[#8f847e]">AIPOGER</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[0.16em] text-[#f4f0ed]">鬥歌資料填寫</h1>
          <p className="mt-3 text-sm text-[#cfc7c2]">先填寫資料並上傳音樂，下一步會進入 Hook 裁切。</p>

          <form className="mt-7 space-y-5" onSubmit={handleGoCropper}>
            <label className="block">
              <span className="mb-2 block text-sm tracking-[0.12em] text-[#d5ccc7]">鬥士名稱</span>
              <input
                value={fighterName}
                onChange={(event) => setFighterName(event.target.value)}
                placeholder="例如：夜色迴響"
                className="h-12 w-full rounded-xl border border-[#5f646b] bg-[#272b30] px-4 text-sm text-[#f4efeb] placeholder:text-[#968f8a] focus:outline-none focus:ring-2 focus:ring-[#ff7a28]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm tracking-[0.12em] text-[#d5ccc7]">歌曲種類</span>
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value as (typeof genres)[number])}
                className="h-12 w-full rounded-xl border border-[#5f646b] bg-[#272b30] px-4 text-sm text-[#f4efeb] focus:outline-none focus:ring-2 focus:ring-[#ff7a28]"
              >
                {genres.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm tracking-[0.12em] text-[#d5ccc7]">上傳音樂</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setSongFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-[#5f646b] bg-[#272b30] p-3 text-sm text-[#efeae6] file:mr-3 file:rounded-lg file:border-0 file:bg-[#4e535a] file:px-3 file:py-2 file:text-sm file:text-[#f7f1ed]"
              />
              {songFile && <p className="mt-2 text-xs text-[#c1b6b0]">已選擇：{songFile.name}</p>}
            </label>

            {errorMessage && <p className="text-sm text-[#ffba92]">{errorMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-[#767c83] bg-gradient-to-b from-[#666c73] to-[#4a5057] px-5 py-4 text-base font-semibold tracking-[0.14em] text-[#f8f3ef] transition hover:border-[#ff8d40] hover:shadow-[0_0_18px_rgba(255,121,40,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              開始 Hook 裁切
            </button>
          </form>
          </section>
        )}
      </div>
    </main>
  );
}
