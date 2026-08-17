import { AIPOGER_CHOICE_LOGO } from "@/lib/brand";

type AipogerChoiceCoverProps = {
  src: string;
  alt?: string;
  className?: string;
  logoClassName?: string;
};

export function AipogerChoiceCover({
  src,
  alt = "",
  className = "",
  logoClassName = "h-7 w-8",
}: AipogerChoiceCoverProps) {
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={AIPOGER_CHOICE_LOGO}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute left-2 top-2 z-10 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] ${logoClassName}`}
      />
    </span>
  );
}
