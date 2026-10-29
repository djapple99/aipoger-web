"use client";
import { useEffect, useRef } from "react";
import { externalEmbedUrl, type ExternalMusic } from "@/lib/external-music";
import { musicPlayer, getMusicPlayerState } from "@/lib/music-player-store";
import { useI18n } from "@/lib/i18n";

import { loadYouTubeAPI, type YouTubePlayer } from "@/lib/youtube-player-api";

export default function ExternalMusicPlayer({
  media,
  title,
  onPlaying,
  onError,
  onEnded,
  autoPlay = false,
  onAutoplayBlocked,
}: {
  media: ExternalMusic;
  title: string;
  onPlaying?: () => void;
  onError?: () => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  onAutoplayBlocked?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onPlaying, onError, onEnded, onAutoplayBlocked });
  callbacks.current = { onPlaying, onError, onEnded, onAutoplayBlocked };
  const { lang } = useI18n();
  const { provider, mediaId } = media;
  useEffect(() => {
    if (getMusicPlayerState().playing) musicPlayer?.toggle();
    if (provider !== "youtube") return;
    let active = true;
    let started = false;
    let ended = false;
    const timeout = window.setTimeout(() => { if (active) callbacks.current.onError?.(); }, 15_000);
    let player: YouTubePlayer | undefined;
    void loadYouTubeAPI()
      .then((api) => {
        if (!active || !container.current) return;
        // The API owns this child; React owns only its enclosing container.
        const mount = document.createElement("div");
        container.current.appendChild(mount);
        player = new api.Player(mount, {
          width: "100%",
          height: "100%",
          host: "https://www.youtube-nocookie.com",
          videoId: mediaId,
          playerVars: {
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
            autoplay: autoPlay ? 1 : 0,
          },
          events: {
            onReady: () => {
              if (!active) return;
              window.clearTimeout(timeout);
              const frame = container.current?.querySelector("iframe");
              if (frame) {
                frame.title = title;
                frame.style.position = "absolute";
                frame.style.inset = "0";
              }
              if (autoPlay) player?.playVideo();
            },
            onStateChange: (event: { data: number }) => {
              if (!active) return;
              if (event.data === 1) { started = true; ended = false; callbacks.current.onPlaying?.(); }
              if (event.data === 0 && started && !ended) {
                ended = true;
                callbacks.current.onEnded?.();
              }
            },
            onAutoplayBlocked: () => { if (active) callbacks.current.onAutoplayBlocked?.(); },
            onError: () => {
              if (active) callbacks.current.onError?.();
            },
          },
        });
      })
      .catch(() => {
        if (active) callbacks.current.onError?.();
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      player?.destroy();
    };
  }, [provider, mediaId, title, autoPlay]);
  return (
    <div>
      {provider === "youtube" ? (
        <div
          ref={container}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16/9",
            minHeight: 200,
            background: "#080808",
          }}
        />
      ) : (
        <iframe
          key={externalEmbedUrl(media)}
          src={externalEmbedUrl(media)}
          title={title}
          onError={() => callbacks.current.onError?.()}
          style={{ width: "100%", height: 180, border: 0, borderRadius: 4 }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-zinc-400 underline"
      >
        {lang === "zh"
          ? "在原平台開啟"
          : lang === "ja"
            ? "元のサービスで開く"
            : lang === "ko"
              ? "원래 플랫폼에서 열기"
              : "Open on original platform"}{" "}
        ↗
      </a>
    </div>
  );
}
