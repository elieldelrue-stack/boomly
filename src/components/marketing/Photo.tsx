"use client";

import { useState } from "react";

/** Photo avec repli élégant (formes de la marque) si l'image ne charge pas. */
export function Photo({ src, alt, className = "", tone = "brand" }: { src: string; alt: string; className?: string; tone?: "brand" | "forest" | "cream" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const bg = { brand: "bg-brand-200", forest: "bg-forest-100", cream: "bg-cream-300" }[tone];
    const shape = { brand: "bg-brand-400", forest: "bg-forest-300", cream: "bg-brand-300" }[tone];
    return (
      <div role="img" aria-label={alt} className={`relative overflow-hidden ${bg} ${className}`}>
        <div className={`absolute -right-6 -bottom-8 h-2/3 w-2/3 rounded-[48%_52%_40%_60%] ${shape} opacity-70`} />
        <div className="absolute top-6 left-6 h-1/4 w-1/4 rounded-full bg-white/50" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />
  );
}
