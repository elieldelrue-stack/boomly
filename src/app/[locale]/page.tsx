import { getLocale, getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/settings";
import { getLandingData } from "@/lib/landing-data";
import { BAG_SIZES, formatEuros, priceForSize } from "@/lib/pricing";
import { IMAGES } from "@/lib/site-config";
import { TravelerSearch } from "@/components/travel/TravelerSearch";
import { Reveal } from "@/components/marketing/Reveal";
import { CountUp } from "@/components/marketing/CountUp";
import { Photo } from "@/components/marketing/Photo";
import { Blob } from "@/components/marketing/Blob";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { BagIllustration } from "@/components/marketing/BagIllustration";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Faq } from "@/components/marketing/Faq";
import { PartnerPitch } from "@/components/marketing/PartnerPitch";
import {
  IconCalendarCheck,
  IconCheck,
  IconLock,
  IconPin,
  IconQr,
  IconShield,
  IconStar,
  IconX,
} from "@/components/marketing/Icons";

// Seuils à partir desquels on affiche les vrais chiffres de la plateforme.
const MIN_REVIEWS_FOR_BADGE = 5;
const MIN_LOCATIONS_FOR_STATS = 10;
const MIN_TESTIMONIALS = 3;

export default async function HomePage() {
  const [t, ts, locale, settings, data] = await Promise.all([
    getTranslations("Landing"),
    getTranslations("Sizes"),
    getLocale(),
    getSettings(),
    getLandingData(),
  ]);
  const eur = (c: number) => formatEuros(c, locale);
  const prices = BAG_SIZES.map((s) => priceForSize(settings, s));
  const minPrice = Math.min(...prices);

  const showRating = data.ratingAvg !== null && data.ratingCount >= MIN_REVIEWS_FOR_BADGE;
  const showRealStats = data.locations >= MIN_LOCATIONS_FOR_STATS;

  const steps = [
    { img: IMAGES.stepBook, icon: IconPin, title: t("step1Title"), text: t("step1Text"), tone: "brand" as const },
    { img: IMAGES.stepDrop, icon: IconQr, title: t("step2Title"), text: t("step2Text"), tone: "forest" as const },
    { img: IMAGES.stepPick, icon: IconCalendarCheck, title: t("step3Title"), text: t("step3Text"), tone: "cream" as const },
  ];

  const compareRows: { label: string; boomly: string | true; station: string | false; others: string | true | false }[] = [
    { label: t("cmpPrice"), boomly: t("cmpPriceBoomly", { price: eur(minPrice) }), station: t("cmpPriceStation"), others: t("cmpPriceOthers") },
    { label: t("cmpOnline"), boomly: true, station: false, others: true },
    { label: t("cmpCancel"), boomly: true, station: false, others: t("cmpDepends") },
    { label: t("cmpWhere"), boomly: true, station: t("cmpStationOnly"), others: true },
    { label: t("cmpNoAccount"), boomly: true, station: t("cmpOnSite"), others: t("cmpDepends") },
    { label: t("cmpPhoto"), boomly: true, station: false, others: t("cmpDepends") },
    { label: t("cmpLocal"), boomly: t("cmpLocalBoomly", { share: settings.partner_share_percent }), station: false, others: t("cmpDepends") },
  ];

  const faq = (["1", "2", "3", "4", "5", "6", "7", "8"] as const).map((k) => ({ q: t(`faqQ${k}`), a: t(`faqA${k}`) }));

  const cell = (v: string | boolean, highlight = false) =>
    v === true ? (
      <IconCheck className={`mx-auto h-5 w-5 ${highlight ? "text-white" : "text-forest-500"}`} aria-label={t("yes")} />
    ) : v === false ? (
      <IconX className="mx-auto h-5 w-5 text-ink/30" aria-label={t("no")} />
    ) : (
      <span className={highlight ? "font-semibold" : "text-muted"}>{v}</span>
    );

  return (
    <>
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-12 md:pb-24">
          <div className="relative z-10">
            {showRating ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-soft">
                <span className="flex text-brand-500">
                  {Array.from({ length: 5 }, (_, i) => (
                    <IconStar key={i} className="h-4 w-4" />
                  ))}
                </span>
                {t("rated", { rating: data.ratingAvg!.toLocaleString(locale), count: data.ratingCount })}
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-3 py-1.5 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-brand-400" />
                {t("badge")}
              </p>
            )}
            <h1 className="mt-5 font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.045em] sm:text-6xl lg:text-[76px]">
              {t("titleA")} <span className="relative whitespace-nowrap text-brand-500">{t("titleB")}</span>
              <br className="hidden sm:block" /> {t("titleC")}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">{t("subtitle", { price: eur(minPrice) })}</p>
            <div className="mt-7 max-w-xl">
              <TravelerSearch />
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink/80">
              <li className="flex items-center gap-1.5">
                <IconCalendarCheck className="h-5 w-5 text-forest-700" />
                {t("reassure1")}
              </li>
              <li className="flex items-center gap-1.5">
                <IconShield className="h-5 w-5 text-forest-700" />
                {t("reassure2")}
              </li>
              <li className="flex items-center gap-1.5">
                <IconLock className="h-5 w-5 text-forest-700" />
                {t("reassure3")}
              </li>
            </ul>
          </div>

          <div className="relative mx-auto mt-4 h-[540px] w-full max-w-[460px] sm:h-[600px]">
            <Blob className="absolute inset-x-2 top-16 bottom-6 bg-brand-500 sm:inset-x-0" />
            <div className="absolute top-0 -right-2 h-56 w-44 overflow-hidden rounded-[32px] shadow-lift rotate-6 sm:right-0 sm:h-64 sm:w-52">
              <Photo src={IMAGES.heroTraveler} alt={t("heroPhotoAlt")} className="h-full w-full" />
            </div>
            <div className="absolute bottom-24 -left-1 z-20 hidden rotate-[-4deg] rounded-2xl bg-forest-700 px-4 py-3 text-white shadow-lift motion-safe:animate-float sm:block">
              <p className="text-xs text-white/70">{t("floatLabel")}</p>
              <p className="font-display text-lg font-bold">{t("floatValue")}</p>
            </div>
            <div className="absolute inset-x-0 top-10 z-10 flex justify-center">
              <PhoneMockup
                l={{
                  shop: t("mockShop"),
                  meta: t("mockMeta"),
                  open: t("mockOpen"),
                  dropoff: t("mockDropoff"),
                  pickup: t("mockPickup"),
                  today: t("mockToday"),
                  sizes: [ts("small"), ts("medium"), ts("large")],
                  prices: [`${eur(prices[0])} ${ts("perDay")}`, `${eur(prices[1])} ${ts("perDay")}`, `${eur(prices[2])} ${ts("perDay")}`],
                  total: t("mockTotal"),
                  totalValue: eur(prices[1] + prices[2]),
                  cta: t("mockCta"),
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CHIFFRES ===================== */}
      <section className="bg-forest-800 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 text-center sm:grid-cols-3 sm:py-14">
          {showRealStats ? (
            <>
              <Stat value={<CountUp value={data.locations} locale={locale} />} label={t("statLocations")} />
              <Stat value={<CountUp value={data.cities} locale={locale} />} label={t("statCities")} />
              <Stat value={<CountUp value={data.bagsStored} locale={locale} />} label={t("statBags")} />
            </>
          ) : (
            <>
              <Stat value={<CountUp value={minPrice / 100} decimals={2} locale={locale} suffix=" €" />} label={t("factPrice")} />
              <Stat value={<CountUp value={settings.partner_share_percent} locale={locale} suffix=" %" />} label={t("factShare")} />
              <Stat value={<CountUp value={1} locale={locale} suffix=" min" />} label={t("factTime")} />
            </>
          )}
        </div>
      </section>

      {/* ===================== COMMENT ÇA MARCHE ===================== */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-20 overflow-x-clip px-4 py-20 sm:py-28">
        <Reveal>
          <p className="font-semibold text-brand-600">{t("howKicker")}</p>
          <h2 className="mt-2 max-w-2xl font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("howTitle")}</h2>
        </Reveal>
        <ol className="mt-14 flex flex-col gap-16 sm:gap-24">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const reverse = i % 2 === 1;
            return (
              <li key={i}>
                <Reveal className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
                  <div className="relative">
                    <Blob
                      animated={false}
                      className={`absolute -inset-4 ${["bg-brand-200", "bg-forest-100", "bg-cream-300"][i]} ${reverse ? "rotate-12" : "-rotate-6"}`}
                    />
                    <Photo
                      src={s.img}
                      alt={s.title}
                      tone={s.tone}
                      className={`relative aspect-[4/3] w-full shadow-lift ${["rounded-[40px_40px_40px_8px]", "rounded-[8px_40px_40px_40px]", "rounded-[40px]"][i]}`}
                    />
                  </div>
                  <div className={reverse ? "md:pr-6" : "md:pl-6"}>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-6xl leading-none font-extrabold text-brand-500/25">0{i + 1}</span>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white">
                        <Icon className="h-6 w-6" />
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-3xl font-bold">{s.title}</h3>
                    <p className="mt-3 max-w-md text-lg leading-relaxed text-muted">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ===================== TARIFS ===================== */}
      <section id="tarifs" className="scroll-mt-20 bg-brand-500 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="max-w-2xl">
            <h2 className="font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("pricesTitle")}</h2>
            <p className="mt-3 text-lg text-white/85">{t("pricesText")}</p>
          </Reveal>
          <div className="mt-12 grid items-end gap-5 md:grid-cols-3">
            {BAG_SIZES.map((size, i) => {
              const featured = size === "medium";
              return (
                <Reveal key={size} delay={i * 120}>
                  <div
                    className={`lift relative rounded-[32px] p-7 ${featured ? "bg-ink text-white md:-mt-8 md:pb-12" : "bg-cream-50 text-ink"}`}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-7 rounded-full bg-forest-500 px-3 py-1 text-xs font-bold text-white">{t("popular")}</span>
                    )}
                    <BagIllustration size={size} className={`h-28 w-28 ${featured ? "text-white" : "text-ink"}`} />
                    <h3 className="mt-4 font-display text-2xl font-bold">{ts(size)}</h3>
                    <p className={`mt-1 text-sm ${featured ? "text-white/70" : "text-muted"}`}>{ts(`${size}Hint`)}</p>
                    <p className="mt-6 font-display text-5xl font-extrabold tracking-tight">
                      {eur(prices[i])}
                      <span className={`ml-1 text-base font-semibold ${featured ? "text-white/70" : "text-muted"}`}>{ts("perDay")}</span>
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-8 text-sm text-white/85">{t("pricesNote")}</p>
        </div>
      </section>

      {/* ===================== COMPARATIF ===================== */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <Reveal>
          <h2 className="max-w-2xl font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("cmpTitle")}</h2>
        </Reveal>
        <Reveal className="mt-10">
          <table className="w-full table-fixed border-separate border-spacing-0 text-center text-[13px] leading-snug sm:text-[15px]">
            <thead>
              <tr>
                <th className="w-[31%] sm:w-[34%]" />
                <th className="rounded-t-[20px] bg-brand-500 px-1.5 py-4 font-display text-base font-bold text-white sm:px-4 sm:py-5 sm:text-lg">Boomly</th>
                <th className="px-1.5 py-4 font-display text-[13px] font-bold sm:px-4 sm:py-5 sm:text-lg">{t("cmpStation")}</th>
                <th className="px-1.5 py-4 font-display text-[13px] font-bold sm:px-4 sm:py-5 sm:text-lg">{t("cmpOthers")}</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((r, i) => (
                <tr key={r.label}>
                  <th scope="row" className={`py-3.5 pr-2 text-left font-medium sm:py-4 sm:pr-4 ${i ? "border-t border-ink/10" : ""}`}>{r.label}</th>
                  <td className={`bg-brand-500 px-1.5 py-3.5 text-white sm:px-4 sm:py-4 ${i === compareRows.length - 1 ? "rounded-b-[20px]" : ""} ${i ? "border-t border-white/20" : ""}`}>
                    {cell(r.boomly, true)}
                  </td>
                  <td className={`px-1.5 py-3.5 sm:px-4 sm:py-4 ${i ? "border-t border-ink/10" : ""}`}>{cell(r.station)}</td>
                  <td className={`px-1.5 py-3.5 sm:px-4 sm:py-4 ${i ? "border-t border-ink/10" : ""}`}>{cell(r.others)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="mt-4 text-xs text-muted">{t("cmpNote")}</p>
      </section>

      {/* ===================== AVIS (réels uniquement) ===================== */}
      {data.testimonials.length >= MIN_TESTIMONIALS && (
        <section className="bg-cream-200 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <Reveal>
              <h2 className="font-display text-4xl font-extrabold sm:text-5xl">{t("reviewsTitle")}</h2>
            </Reveal>
          </div>
          <div className="mt-10">
            <Testimonials items={data.testimonials} />
          </div>
        </section>
      )}

      {/* ===================== COMMERÇANTS ===================== */}
      <PartnerPitch />

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 pb-24 md:grid-cols-[1fr_1.6fr]">
        <Reveal>
          <h2 className="font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("faqTitle")}</h2>
          <p className="mt-3 text-muted">{t("faqText")}</p>
        </Reveal>
        <Reveal delay={100}>
          <Faq items={faq} />
        </Reveal>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="font-display text-5xl font-extrabold tracking-tight text-brand-400 sm:text-6xl">{value}</p>
      <p className="mt-2 text-white/75">{label}</p>
    </div>
  );
}
