export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-[42%_58%_52%_48%/50%_44%_56%_50%] bg-brand-500 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="7.5" width="14" height="12.5" rx="3" />
          <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M9.5 12v4M14.5 12v4" />
        </svg>
      </span>
      <span className={`font-display text-[22px] font-extrabold tracking-[-0.04em] ${light ? "text-white" : "text-ink"}`}>boomly</span>
    </span>
  );
}
