import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/settings";
import { BAG_SIZES, formatEuros, priceForSize } from "@/lib/pricing";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const ts = await getTranslations("Sizes");
  const locale = await getLocale();
  // Prix lus dans la base (réglables depuis l'admin).
  const settings = await getSettings();
  const sizes = BAG_SIZES.map((size) => ({
    size,
    price: formatEuros(priceForSize(settings, size), locale),
  }));
  const minPrice = formatEuros(Math.min(...BAG_SIZES.map((s) => priceForSize(settings, s))), locale);

  const steps = [
    { n: 1, title: t("step1Title"), text: t("step1Text") },
    { n: 2, title: t("step2Title"), text: t("step2Text") },
    { n: 3, title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:pt-20">
          <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            {t("badge")}
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{t("subtitle")}</p>

          <form className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row" aria-describedby="search-soon">
            <label htmlFor="q" className="sr-only">{t("searchPlaceholder")}</label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder={t("searchPlaceholder")}
              className="h-12 w-full rounded-xl sm:flex-1 border border-stone-300 bg-white px-4 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              disabled
              className="h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white opacity-60"
            >
              {t("searchButton")}
            </button>
          </form>
          <p id="search-soon" className="mt-2 text-sm text-muted">{t("searchSoon")}</p>

          <div className="mt-8 max-w-xl rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xl font-bold text-brand-700">{t("priceFrom", { price: minPrice })}</p>
            <ul className="mt-3 divide-y divide-stone-100">
              {sizes.map(({ size, price }) => (
                <li key={size} className="flex items-center justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium">{ts(size)}</span>
                    <span className="block text-sm text-muted">{ts(`${size}Hint`)}</span>
                  </span>
                  <span className="shrink-0 font-semibold">
                    {price} <span className="text-sm font-normal text-muted">{ts("perDay")}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">{t("priceNote")}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">{t("howTitle")}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl border border-stone-200 p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex flex-col gap-4 rounded-3xl bg-ink px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">{t("partnerTitle")}</h2>
            <p className="mt-2 text-stone-300">{t("partnerText")}</p>
          </div>
          <Link
            href="/partenaire/inscription"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"
          >
            {t("partnerCta")}
          </Link>
        </div>
      </section>
    </>
  );
}
