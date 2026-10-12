"use client";

import Image from "next/image";
import { useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import type { HomeWork } from "@/lib/home-discovery";
import styles from "./home-editorial.module.css";

export default function WorkImage({ work, video = false, priority = false }: { work: HomeWork; video?: boolean; priority?: boolean }) {
  const candidates = video && work.videoId ? ["maxresdefault", "sddefault", "hqdefault"].map(size => `https://i.ytimg.com/vi/${work.videoId}/${size}.jpg`) : [];
  const [failed, setFailed] = useState<string[]>([]);
  const src = [...candidates, work.coverUrl, AIPOGER_BRAND_LOGO].find(value => value && !failed.includes(value));
  return src ? <Image src={src} alt={work.title} width={video ? 960 : 240} height={video ? 540 : 240}
    unoptimized priority={priority} className={styles.artwork} onError={() => setFailed(current => [...current, src])}
    onLoad={event => { if (video && candidates.includes(src) && event.currentTarget.naturalWidth < 200) setFailed(current => [...current, src]); }} /> : null;
}

