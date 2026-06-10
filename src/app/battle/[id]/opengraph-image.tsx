import { ImageResponse } from "next/og";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { BattleShareOg } from "@/lib/battle-share-og";
import { siteOrigin } from "@/lib/battle-og";

export const runtime = "edge";
export const alt = "AIPOGER Drop Battle";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  await params;
  const logoUrl = new URL(AIPOGER_BRAND_LOGO, siteOrigin()).toString();
  return new ImageResponse(
    (
      <BattleShareOg
        logoUrl={logoUrl}
        label="AIPOGER DROP BATTLE"
        subtitle="LISTEN · VOTE · BATTLE"
      />
    ),
    size,
  );
}
