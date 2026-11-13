"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Menu en haut à droite : réserver, espace partenaire, aide. */
export function HeaderMenu() {
  const t = useTranslations("Header");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Referme le menu quand on clique ailleurs ou appuie sur Échap (les liens le referment aussi).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item = "block rounded-2xl px-4 py-3 transition hover:bg-cream-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="header-menu"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-white transition hover:-translate-y-0.5"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        {t("menu")}
      </button>
      {open && (
        <nav
          id="header-menu"
          className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-3xl bg-white p-2 text-ink shadow-lift ring-1 ring-ink/8"
        >
          <Link href="/recherche" onClick={close} className={item}>
            <span className="block font-semibold">{t("menuBook")}</span>
            <span className="block text-sm font-normal text-muted">{t("menuBookText")}</span>
          </Link>
          <div className="rounded-2xl bg-cream-100 px-4 py-3">
            <Link href="/espace-partenaire" onClick={close} className="block font-semibold hover:underline">
              {t("partner")}
            </Link>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <Link href="/partenaire/connexion" onClick={close} className="text-ink/75 hover:text-ink hover:underline">
                → {t("menuLogin")}
              </Link>
              <Link href="/partenaire/inscription" onClick={close} className="text-ink/75 hover:text-ink hover:underline">
                → {t("menuJoin")}
              </Link>
            </div>
          </div>
          <Link href="/#faq" onClick={close} className={item}>
            <span className="block font-semibold">{t("menuHelp")}</span>
            <span className="block text-sm font-normal text-muted">{t("menuHelpText")}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
