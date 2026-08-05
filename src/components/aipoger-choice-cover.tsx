import { AIPOGER_BRAND_LOGO } from "@/lib/brand";

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
  logoClassName = "h-4 w-12",
}: AipogerChoiceCoverProps) {
  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center rounded border border-white/60 bg-black/65 px-1 py-0.5 shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur-[2px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AIPOGER_BRAND_LOGO} alt="" aria-hidden="true" className={`${logoClassName} object-contain`} />
      </span>
    </span>
  );
}
