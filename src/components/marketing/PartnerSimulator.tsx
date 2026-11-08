"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/** Estimation du revenu mensuel d'un commerçant selon le nombre de bagages par jour. */
export function PartnerSimulator({ partnerCentsPerBag }: { partnerCentsPerBag: number }) {
  const t = useTranslations("Landing");
  const locale = useLocale();
  const id = useId();
  const [bags, setBags] = useState(8);
  const monthly = Math.round((bags * partnerCentsPerBag * 30) / 100);
  const nf = locale === "en" ? "en-IE" : "fr-FR";
  const fmt = new Intl.NumberFormat(nf, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const fmt2 = new Intl.NumberFormat(nf, { style: "currency", currency: "EUR" });

  return (
    <div className="rounded-[28px] bg-white p-6 text-ink shadow-lift sm:p-7">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 font-semibold">
        {t("simLabel")}
        <span className="font-display text-2xl text-brand-600 tabular-nums">{bags}</span>
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={40}
        value={bags}
        onChange={(e) => setBags(Number(e.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-cream-200 accent-brand-500"
      />
      <p className="mt-6 text-sm text-muted">{t("simResult")}</p>
      <p className="font-display text-5xl font-extrabold tracking-tight tabular-nums">
        {fmt.format(monthly)}
        <span className="text-lg font-semibold text-muted"> {t("simPerMonth")}</span>
      </p>
      <p className="mt-3 text-xs text-muted">{t("simNote", { amount: fmt2.format(partnerCentsPerBag / 100) })}</p>
    </div>
  );
}
