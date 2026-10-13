"use client";
import { useEffect, useRef } from "react";
import { externalEmbedUrl, type ExternalMusic } from "@/lib/external-music";
import { musicPlayer, getMusicPlayerState } from "@/lib/music-player-store";
import { useI18n } from "@/lib/i18n";

type YouTubePlayer = { destroy: () => void };
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: object) => YouTubePlayer;
};
type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};
let youtubeReady: Promise<YouTubeAPI> | null = null;
function loadYouTubeAPI() {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (!youtubeReady)
    youtubeReady = new Promise<YouTubeAPI>((resolve, reject) => {
      const previous = win.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        youtubeReady = null;
        reject(new Error("Player unavailable"));
      }, 15_000);
      win.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        previous?.();
        if (win.YT?.Player) resolve(win.YT);
        else {
          youtubeReady = null;
          reject(new Error("Player unavailable"));
        }
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        youtubeReady = null;
        reject(new Error("Player unavailable"));
      };
      document.head.appendChild(script);
    });
  return youtubeReady;
}

export default function ExternalMusicPlayer({
  media,
  title,
  onPlaying,
  onError,
}: {
  media: ExternalMusic;
  title: string;
  onPlaying?: () => void;
  onError?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onPlaying, onError });
  callbacks.current = { onPlaying, onError };
  const { lang } = useI18n();
  const { provider, mediaId } = media;
  useEffect(() => {
    if (getMusicPlayerState().playing) musicPlayer?.toggle();
    if (provider !== "youtube") return;
    let active = true;
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
          },
          events: {
            onReady: () => {
              const frame = container.current?.querySelector("iframe");
              if (frame) {
                frame.title = title;
                frame.style.position = "absolute";
                frame.style.inset = "0";
              }
            },
            onStateChange: (event: { data: number }) => {
              if (active && event.data === 1) callbacks.current.onPlaying?.();
            },
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
      player?.destroy();
    };
  }, [provider, mediaId, title]);
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
