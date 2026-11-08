"use client";

import { useEffect, useRef, useState } from "react";

/** Compteur qui défile jusqu'à sa valeur quand il devient visible. */
export function CountUp({ value, decimals = 0, locale, suffix = "" }: { value: number; decimals?: number; locale: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Valeur réelle affichée par défaut (sans JavaScript, ou si l'animation est désactivée).
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let armed = false;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        // Hors écran : on remet à zéro pour l'animer à son arrivée.
        if (!armed) {
          armed = true;
          setShown(0);
        }
        return;
      }
      io.disconnect();
      if (!armed) return; // déjà visible au chargement : on garde la valeur telle quelle
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1400);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const text = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(shown);
  return (
    <span ref={ref} className="tabular-nums">
      {text}
      {suffix}
    </span>
  );
}
