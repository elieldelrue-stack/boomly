import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Link } from "@/i18n/navigation";
import { getPublicLocations } from "@/lib/public-locations";
import { getSettings } from "@/lib/settings";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { parisNow } from "@/lib/paris-time";
import { BAG_SIZES, formatEuros, priceForSize } from "@/lib/pricing";
import { TravelerSearch } from "@/components/travel/TravelerSearch";
import { LocationsMap } from "@/components/travel/LocationsMap";
import { OpeningInfo } from "@/components/travel/OpeningInfo";

export async function generateMetadata() {
  const t = await getTranslations("Search");
  return { title: `${t("title")} · Boomly` };
}

export default async function SearchPage({ searchParams }: PageProps<"/[locale]/recherche">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-muted">{t("loading")}</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

const NEARBY_METERS = 50_000;

async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const t = await getTranslations("Search");
  const tTypes = await getTranslations("BusinessTypes");
  const locale = await getLocale();

  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const hasCenter = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && sp.lat !== undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";

  const [all, settings] = await Promise.all([getPublicLocations(), getSettings()]);
  const minPrice = formatEuros(Math.min(...BAG_SIZES.map((s) => priceForSize(settings, s))), locale);
  const now = parisNow();

  const located = all
    .map((l) => ({ ...l, distance: hasCenter ? distanceMeters(lat, lng, l.latitude, l.longitude) : null }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  const nearby = hasCenter ? located.filter((l) => (l.distance ?? 0) <= NEARBY_METERS) : located;
  const shown = (nearby.length > 0 ? nearby : located).slice(0, 30);

  const points = shown.map((l) => ({
    id: l.id,
    name: l.name,
    latitude: l.latitude,
    longitude: l.longitude,
    href: `/${locale}/consignes/${l.id}`,
    subtitle: `${l.address}, ${l.city}`,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <TravelerSearch initialQuery={q} compact />

      <h1 className="mt-6 text-2xl font-bold">
        {hasCenter && q ? t("resultsNear", { place: q }) : t("title")}
      </h1>
      {hasCenter && nearby.length === 0 && located.length > 0 && (
        <p className="mt-1 text-muted">{t("noneNearby")}</p>
      )}

      {all.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-white shadow-soft p-6 text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="h-64 overflow-hidden rounded-3xl bg-white shadow-soft sm:h-80 lg:sticky lg:top-4 lg:order-2 lg:h-[calc(100vh-8rem)]">
            <LocationsMap
              points={points}
              center={hasCenter ? [lat, lng] : undefined}
              linkLabel={t("book")}
            />
          </div>
          <ul className="flex flex-col gap-3 lg:order-1">
            {shown.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/consignes/${l.id}`}
                  className="flex gap-4 rounded-3xl bg-white p-3 shadow-soft lift"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-200 sm:h-28 sm:w-32">
                    {l.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.photos[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate font-semibold">{l.name}</h2>
                      {l.distance !== null && (
                        <span className="shrink-0 text-sm text-muted">{formatDistance(l.distance, locale)}</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {tTypes(l.business_type)} · {l.address}, {l.city}
                    </p>
                    <OpeningInfo hours={l.hours} now={now} />
                    {l.rating_avg !== null && (
                      <p className="text-sm">
                        <span className="text-amber-500">★</span> <span className="font-semibold">{l.rating_avg.toLocaleString(locale)}</span>{" "}
                        <span className="text-muted">({l.rating_count})</span>
                      </p>
                    )}
                    <p className="mt-auto text-sm font-semibold text-brand-700">{t("from", { price: minPrice })}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
