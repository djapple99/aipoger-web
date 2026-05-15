"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { supabase } from "@/lib/supabase";
import { getCroppedPngBlob } from "@/lib/crop-image";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  imageDataUrl: string | null;
  userId: string;
  onClose: () => void;
  onUploaded: (publicUrl: string) => void;
};

export function AvatarCropUploadModal({ open, imageDataUrl, userId, onClose, onUploaded }: Props) {
  const { t } = useI18n();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!imageDataUrl || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedPngBlob(imageDataUrl, croppedAreaPixels, 512);
      const storagePath = `avatars/${userId}/avatar.png`;
      const { error: upErr } = await supabase.storage
        .from("battle-audio")
        .upload(storagePath, blob, { contentType: "image/png", upsert: true });
      if (upErr) {
        console.error("[avatar upload]", upErr);
        alert(t("avatar_crop_fail"));
        return;
      }
      const { data: pub } = supabase.storage.from("battle-audio").getPublicUrl(storagePath);
      const publicUrl = pub.publicUrl;

      const { data: row } = await supabase.from("user_profiles").select("id").eq("id", userId).maybeSingle();
      if (row) {
        const { error: uErr } = await supabase.from("user_profiles").update({ avatar_url: publicUrl }).eq("id", userId);
        if (uErr) {
          console.error("[user_profiles update]", uErr);
          alert(t("avatar_crop_fail"));
          return;
        }
      } else {
        const { error: iErr } = await supabase.from("user_profiles").insert({ id: userId, avatar_url: publicUrl });
        if (iErr) {
          console.error("[user_profiles insert]", iErr);
          alert(t("avatar_crop_fail"));
          return;
        }
      }

      onUploaded(publicUrl);
      onClose();
    } catch (e) {
      console.error(e);
      alert(t("avatar_crop_fail"));
    } finally {
      setBusy(false);
    }
  };

  if (!open || !imageDataUrl) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal>
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h2 className="text-lg font-bold text-zinc-100">{t("avatar_crop_title")}</h2>
        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black">
          <Cropper
            image={imageDataUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{t("avatar_crop_zoom")}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-orange-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {t("avatar_crop_cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy || !croppedAreaPixels}
            className="rounded-xl border border-orange-500 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-400 hover:bg-orange-500/30 disabled:opacity-50"
          >
            {busy ? t("avatar_crop_uploading") : t("avatar_crop_save")}
          </button>
        </div>
      </div>
    </div>
  );
}
