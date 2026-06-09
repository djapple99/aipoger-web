"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
import { AvatarCropUploadModal } from "@/components/avatar-crop-upload-modal";
import { ProfileBattleCountBadge } from "@/components/profile-battle-count-badge";
import SafetyNotice from "@/components/safety-notice";
import { readFighterNameFromStorage, writeFighterNameToStorage } from "@/lib/fighter-name-storage";
import { loadFighterNameFromProfile, saveFighterNameToProfile } from "@/lib/user-profile-fighter-name";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

function isAllowedAvatarMime(file: File): boolean {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

function ProfileInner() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [fighterName, setFighterName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [fighterSaved, setFighterSaved] = useState(false);
  const [fighterBusy, setFighterBusy] = useState(false);
  const cropFileInputRef = useRef<HTMLInputElement>(null);
  const avatarSectionRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    if (isAuthBypassEnabled) {
      setUserId(null);
      setFighterName(readFighterNameFromStorage() ?? "");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setUserId(null);
      return;
    }
    const uid = session.user.id;
    setUserId(uid);

    const urlFighter = searchParams.get("fighterName")?.trim();
    if (urlFighter) {
      setFighterName(urlFighter);
    }

    if (!urlFighter) {
      const fromProfile = await loadFighterNameFromProfile(uid);
      if (fromProfile) setFighterName(fromProfile);
    }

    const { data } = await supabase.from("user_profiles").select("avatar_url").eq("id", uid).maybeSingle();

    if (typeof data?.avatar_url === "string" && data.avatar_url.length > 0) {
      setAvatarPreview(data.avatar_url);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#avatar-upload") return;
    const tmr = window.setTimeout(() => {
      avatarSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(tmr);
  }, []);

  const openCropPicker = () => {
    if (isAuthBypassEnabled) {
      alert("開發模式（AUTH_BYPASS）無法上傳至 Storage。");
      return;
    }
    if (!userId) {
      alert(t("profile_need_login"));
      router.push("/auth");
      return;
    }
    cropFileInputRef.current?.click();
  };

  const onCropFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedAvatarMime(file)) {
      alert(t("avatar_invalid_type"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      alert(t("avatar_max_2mb"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const saveFighterName = async () => {
    const name = fighterName.trim();
    if (!name) {
      alert(t("profile_fighter_empty"));
      return;
    }
    writeFighterNameToStorage(name);
    if (isAuthBypassEnabled) {
      setFighterSaved(true);
      window.setTimeout(() => setFighterSaved(false), 2000);
      return;
    }
    if (!userId) {
      alert(t("profile_need_login"));
      router.push("/auth");
      return;
    }
    setFighterBusy(true);
    setFighterSaved(false);
    try {
      try {
        await saveFighterNameToProfile(userId, name);
      } catch (error) {
        console.error(error);
        alert(t("profile_fighter_save_fail"));
        return;
      }
      setFighterSaved(true);
      window.setTimeout(() => setFighterSaved(false), 2500);
    } finally {
      setFighterBusy(false);
    }
  };

  return (
    <div className="aipo-stage-bg min-h-screen px-4 py-10 text-white">
      <div className="relative z-10 mx-auto w-full max-w-lg space-y-8">
        <div>
          <p className="aipo-section-kicker">AIPOGER PROFILE</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-orange-100">{t("profile_title")}</h1>
          <p className="mt-2 text-sm text-zinc-500">{t("profile_subtitle")}</p>
        </div>

        <div ref={avatarSectionRef} id="avatar-upload" className="aipo-control-panel rounded-[1.35rem] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{t("upload_avatar")}</h2>
          <p className="mt-1 text-xs text-zinc-600">JPEG / PNG / WebP · {t("avatar_max_2mb")}</p>
          <SafetyNotice kind="upload" compact className="mt-4" />
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
              <button type="button" onClick={openCropPicker} className="group relative shrink-0">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt=""
                    className="h-36 w-36 rounded-full border-4 border-orange-300/28 object-cover shadow-[0_0_34px_rgba(255,106,0,0.12)] transition group-hover:border-orange-400"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-dashed border-orange-300/28 bg-black/35 text-4xl shadow-[0_0_34px_rgba(255,106,0,0.08)] transition group-hover:border-orange-400">
                    😎
                  </div>
                )}
                <span className="aipo-primary-button absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-xs shadow-lg">
                  ✏️
                </span>
              </button>
              <ProfileBattleCountBadge userId={userId} currentUserId={userId} lang={lang === "zh" ? "zh" : "en"} />
            </div>
            <button
              type="button"
              onClick={openCropPicker}
              className="aipo-ghost-button rounded-xl px-4 py-2 text-xs font-black text-orange-100 transition hover:text-white"
            >
              {t("setup_avatar_upload_btn")}
            </button>
            <input ref={cropFileInputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={onCropFileChange} />
          </div>
        </div>

        <div className="aipo-control-panel rounded-[1.35rem] p-6">
          <label className="text-sm font-semibold text-zinc-400">{t("fighter_name")}</label>
          <input
            type="text"
            value={fighterName}
            onChange={(e) => {
              setFighterName(e.target.value);
              setFighterSaved(false);
            }}
            maxLength={30}
            placeholder={t("fighter_name")}
            className="aipo-input mt-3 w-full rounded-2xl px-4 py-3 text-lg transition"
          />
          <button
            type="button"
            disabled={fighterBusy}
            onClick={() => void saveFighterName()}
            className="aipo-primary-button mt-4 w-full rounded-2xl py-3 text-sm font-black transition disabled:opacity-50"
          >
            {fighterBusy ? t("common_loading") : t("profile_save_fighter")}
          </button>
          {fighterSaved && <p className="mt-2 text-center text-xs text-green-400">{t("profile_fighter_saved")}</p>}
        </div>
      </div>

      {userId ? (
        <AvatarCropUploadModal
          open={cropModalOpen}
          imageDataUrl={cropImageSrc}
          userId={userId}
          onClose={() => {
            setCropModalOpen(false);
            setCropImageSrc(null);
          }}
          onUploaded={(url) => {
            setAvatarPreview(url);
            alert(t("avatar_crop_success"));
          }}
        />
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-orange-400">
          {t("common_loading")}
        </div>
      }
    >
      <ProfileInner />
    </Suspense>
  );
}
