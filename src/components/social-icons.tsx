import { AIPOGER_SOCIAL_LINKS } from "@/lib/brand";

type SocialIconProps = {
  label: string;
  className?: string;
};

export function SocialIcon({ label, className = "h-11 w-11" }: SocialIconProps) {
  const normalized = label.toLowerCase();

  if (normalized.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.4" fill="#ff8a18" />
        <circle cx="16.4" cy="7.3" r="4.2" fill="#6f58ff" opacity="0.92" />
        <circle cx="8" cy="16.2" r="4.4" fill="#ff2a81" opacity="0.9" />
        <circle cx="7.1" cy="7.1" r="3.6" fill="#ffe66b" opacity="0.64" />
        <path d="M5.8 5.15h7.7" stroke="white" strokeLinecap="round" strokeOpacity="0.46" strokeWidth="1.35" />
        <circle cx="12" cy="12" r="4.05" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="17.1" cy="6.9" r="1.35" fill="white" />
      </svg>
    );
  }

  if (normalized.includes("discord")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M5.35 8.15c3.75-2.35 9.55-2.35 13.3 0l1.25 7.7c-1.62 1.38-3.22 2.12-4.8 2.32l-.88-1.35c-.72.12-1.48.18-2.22.18s-1.5-.06-2.22-.18l-.88 1.35c-1.58-.2-3.18-.94-4.8-2.32l1.25-7.7Z"
          fill="#7284ff"
        />
        <path d="M7.15 8.45c2.9-1.1 6.8-1.1 9.7 0" fill="none" stroke="white" strokeLinecap="round" strokeOpacity="0.46" strokeWidth="1.25" />
        <circle cx="9.4" cy="12.3" r="1.18" fill="white" />
        <circle cx="14.6" cy="12.3" r="1.18" fill="white" />
        <path d="M9.55 15.1c1.62.72 3.28.72 4.9 0" fill="none" stroke="white" strokeLinecap="round" strokeWidth="1.25" />
      </svg>
    );
  }

  if (normalized.includes("tiktok")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="#050505" />
        <path d="M14.65 5.3c.32 2.05 1.5 3.34 3.55 3.62v2.7c-1.28-.03-2.42-.42-3.43-1.14v4.8c0 2.52-1.72 4.28-4.28 4.28-2.36 0-4.08-1.54-4.08-3.78 0-2.35 1.86-3.92 4.46-3.74v2.78c-.95-.18-1.68.22-1.68.96 0 .68.55 1.08 1.25 1.08.83 0 1.35-.5 1.35-1.53V5.3h2.86Z" fill="#ffffff" />
        <path d="M13.38 5.3v10.03c0 1.03-.52 1.53-1.35 1.53-.28 0-.54-.06-.75-.18.24.56.78.88 1.46.88.83 0 1.35-.5 1.35-1.53V6.9c.7 1.2 1.72 1.98 3.02 2.2v-.18c-2.05-.28-3.23-1.57-3.55-3.62h-.18Z" fill="#ff2a81" opacity="0.9" />
        <path d="M10.87 12.04c-2.6-.18-4.46 1.39-4.46 3.74 0 .86.26 1.62.72 2.22-.02-.14-.03-.28-.03-.43 0-2.35 1.86-3.92 4.46-3.74v-1.73c-.23-.03-.46-.05-.69-.06Z" fill="#29f3ff" opacity="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.6" fill="#1877f2" />
      <circle cx="9" cy="7.2" r="5" fill="#70b9ff" opacity="0.45" />
      <path d="M7.8 6.1c2.55-1.75 6.35-2.02 9.08-.4" fill="none" stroke="white" strokeLinecap="round" strokeOpacity="0.42" strokeWidth="1.2" />
      <path
        d="M13.65 20.7v-7.35h2.42l.46-3.04h-2.88V8.33c0-.83.4-1.64 1.7-1.64h1.32V4.1c-.78-.12-1.58-.2-2.38-.2-2.44 0-4.04 1.48-4.04 4.16v2.25H7.52v3.04h2.73v7.35h3.4Z"
        fill="white"
      />
    </svg>
  );
}

export function SocialIconCluster({
  label,
  className = "",
  iconClassName = "h-11 w-11",
}: {
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label={label ?? "AIPOGER social links"}>
      {label && <span className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>}
      <div className="flex items-center gap-5">
        {AIPOGER_SOCIAL_LINKS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            title={`${social.label} ${social.handle}`}
            aria-label={`${social.label} ${social.handle}`}
            className="group relative inline-flex h-12 w-12 items-center justify-center transition hover:-translate-y-0.5 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          >
            <span className="absolute inset-1 rounded-full bg-white/22 opacity-75 blur-lg transition group-hover:opacity-100" aria-hidden="true" />
            <span className="absolute bottom-0 h-2 w-9 rounded-full bg-black/58 blur-md" aria-hidden="true" />
            <SocialIcon
              label={social.label}
              className={`${iconClassName} relative drop-shadow-[0_9px_12px_rgba(0,0,0,0.62)] [filter:brightness(1.28)_saturate(1.42)_contrast(1.08)]`}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
