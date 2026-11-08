/** Illustrations simples des trois tailles de bagage. */
export function BagIllustration({ size, className = "" }: { size: "small" | "medium" | "large"; className?: string }) {
  const stroke = { stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (size === "small")
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden>
        <ellipse cx="60" cy="108" rx="30" ry="4" fill="currentColor" opacity="0.12" />
        <path d="M44 34c0-10 7-16 16-16s16 6 16 16" fill="none" {...stroke} />
        <rect x="34" y="32" width="52" height="72" rx="18" fill="#ff7a35" {...stroke} />
        <rect x="44" y="66" width="32" height="24" rx="7" fill="#ffe2cc" {...stroke} />
        <path d="M50 48h20" {...stroke} />
      </svg>
    );
  if (size === "medium")
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden>
        <ellipse cx="60" cy="110" rx="30" ry="4" fill="currentColor" opacity="0.12" />
        <path d="M50 30V18h20v12" fill="none" {...stroke} />
        <rect x="32" y="30" width="56" height="70" rx="12" fill="#ffffff" {...stroke} />
        <path d="M48 42v46M60 42v46M72 42v46" {...stroke} opacity="0.5" />
        <circle cx="42" cy="105" r="4" fill="#17130f" />
        <circle cx="78" cy="105" r="4" fill="#17130f" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <ellipse cx="60" cy="113" rx="34" ry="4" fill="currentColor" opacity="0.12" />
      <path d="M50 18V6h20v12" fill="none" {...stroke} />
      <rect x="26" y="18" width="68" height="86" rx="14" fill="#145a41" {...stroke} />
      <path d="M26 46h68M26 76h68" stroke="#ffffff" strokeWidth="3" opacity="0.5" />
      <circle cx="38" cy="109" r="4.5" fill="#17130f" />
      <circle cx="82" cy="109" r="4.5" fill="#17130f" />
    </svg>
  );
}
