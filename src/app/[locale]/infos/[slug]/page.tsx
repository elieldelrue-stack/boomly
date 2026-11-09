import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEGAL, PROVIDERS } from "@/lib/legal-config";
import { getSettings } from "@/lib/settings";
import { formatEuros } from "@/lib/pricing";
import { routing } from "@/i18n/routing";
import { LEGAL_SLUGS, type LegalSlug } from "@/content/legal-types";
import { legalFr } from "@/content/legal-fr";
import { legalEn } from "@/content/legal-en";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => LEGAL_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/infos/[slug]">) {
  const { slug } = await params;
  if (!LEGAL_SLUGS.includes(slug as LegalSlug)) return {};
  const doc = (await docsFor())[slug as LegalSlug];
  return { title: `${doc.title} · Boomly` };
}

async function docsFor() {
  const [locale, settings] = await Promise.all([getLocale(), getSettings()]);
  const ctx = {
    legal: LEGAL,
    providers: PROVIDERS,
    share: settings.partner_share_percent,
    prices: {
      small: formatEuros(settings.price_small_cents, locale),
      medium: formatEuros(settings.price_medium_cents, locale),
      large: formatEuros(settings.price_large_cents, locale),
    },
  };
  return locale === "en" ? legalEn(ctx) : legalFr(ctx);
}

export default async function LegalPage({ params }: PageProps<"/[locale]/infos/[slug]">) {
  const { slug } = await params;
  if (!LEGAL_SLUGS.includes(slug as LegalSlug)) notFound();
  const [docs, t] = await Promise.all([docsFor(), getTranslations("Legal")]);
  const doc = docs[slug as LegalSlug];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <div className="grid gap-10 md:grid-cols-[220px_1fr]">
        <nav aria-label={t("nav")} className="order-2 md:order-1">
          <ul className="flex flex-wrap gap-2 text-sm md:sticky md:top-24 md:flex-col md:gap-1">
            {LEGAL_SLUGS.map((s) => (
              <li key={s}>
                <Link
                  href={`/infos/${s}`}
                  className={`block rounded-full px-3 py-1.5 md:rounded-xl ${s === slug ? "bg-ink font-semibold text-white" : "bg-white text-ink/80 hover:text-ink md:bg-transparent"}`}
                >
                  {docs[s].title.split(" — ")[0]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 md:order-2">
          <h1 className="font-display text-4xl leading-tight font-extrabold sm:text-5xl">{doc.title}</h1>
          <p className="mt-3 text-sm text-muted">{t("updated", { date: LEGAL.lastUpdated })}</p>
          <div className="mt-8 flex flex-col gap-8">
            {doc.sections.map((s) => (
              <section key={s.h} className="rounded-[28px] bg-white p-6 shadow-soft sm:p-8">
                <h2 className="font-display text-xl font-bold">{s.h}</h2>
                <div className="mt-3 space-y-3 leading-relaxed text-ink/85 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
                  {s.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
