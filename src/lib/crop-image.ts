import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

/** 依 react-easy-crop 的 pixel crop 輸出正方形 PNG（輸出邊長 outPx） */
export async function getCroppedPngBlob(imageSrc: string, pixelCrop: Area, outPx = 512): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outPx;
  canvas.height = outPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d unsupported");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outPx,
    outPx,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob failed"));
      },
      "image/png",
      0.92,
    );
  });
}
