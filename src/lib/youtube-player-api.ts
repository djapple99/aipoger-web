export type YouTubePlayer = { destroy: () => void; loadVideoById: (id: string) => void; cueVideoById: (id: string) => void; playVideo: () => void; pauseVideo: () => void; getPlayerState: () => number; getCurrentTime: () => number; getDuration: () => number; seekTo: (seconds: number, allowSeekAhead: boolean) => void; setVolume: (volume: number) => void; getVideoData: () => { video_id?: string }; };
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: object) => YouTubePlayer;
};
type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};
let youtubeReady: Promise<YouTubeAPI> | null = null;
export function loadYouTubeAPI() {
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

