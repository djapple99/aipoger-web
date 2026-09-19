import { ImageResponse } from "next/og";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { BattleShareOg } from "@/lib/battle-share-og";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const logoUrl = new URL(AIPOGER_BRAND_LOGO, url.origin).toString();
  return new ImageResponse(
    (
      <BattleShareOg
        logoUrl={logoUrl}
        label="AIPOGER DROP BATTLE"
        subtitle="OPEN THE ARENA"
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

