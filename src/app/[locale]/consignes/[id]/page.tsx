import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Link } from "@/i18n/navigation";
import { getPublicLocation } from "@/lib/public-locations";
import { getSettings } from "@/lib/settings";
import { parisNow } from "@/lib/paris-time";
import { BookingForm } from "@/components/travel/BookingForm";
import { LocationsMap } from "@/components/travel/LocationsMap";
import { OpeningInfo } from "@/components/travel/OpeningInfo";
import { Card } from "@/components/ui/form";

export default async function LocationDetailPage({ params }: PageProps<"/[locale]/consignes/[id]">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-muted">{t("loading")}</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const location = await getPublicLocation(id);
  if (!location) notFound();

  const [settings, t, tTypes, tDays, tf] = await Promise.all([
    getSettings(),
    getTranslations("Booking"),
    getTranslations("BusinessTypes"),
    getTranslations("Weekdays"),
    getTranslations("LocationForm"),
  ]);
  const now = parisNow();
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <Link href="/recherche" className="text-sm text-muted hover:underline">
        ← {t("backToSearch")}
      </Link>

      <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          {location.photos.length > 0 && (
            <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {location.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt={`${location.name} – ${i + 1}`}
                  className="aspect-[4/3] w-[85%] shrink-0 snap-start rounded-2xl object-cover sm:w-[48%]"
                />
              ))}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-brand-700">{tTypes(location.business_type)}</p>
            <h1 className="mt-1 text-3xl font-bold">{location.name}</h1>
            <p className="mt-2 text-muted">
              {location.address}, {location.postal_code} {location.city} ·{" "}
              <a href={directions} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                {t("directions")} ↗
              </a>
            </p>
            <div className="mt-2">
              <OpeningInfo hours={location.hours} now={now} />
            </div>
          </div>

          {location.description && <p className="whitespace-pre-line">{location.description}</p>}

          <Card>
            <h2 className="mb-3 font-semibold">{t("hours")}</h2>
            <ul className="text-sm">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const slots = location.hours.filter((h) => h.weekday === d);
                return (
                  <li
                    key={d}
                    className={`flex justify-between gap-4 border-b border-stone-100 py-1.5 last:border-0 ${d === now.weekday ? "font-semibold" : ""}`}
                  >
                    <span>{tDays(String(d))}</span>
                    <span className={slots.length ? "" : "text-muted"}>
                      {slots.length ? slots.map((s) => `${s.opens_at}–${s.closes_at}`).join(", ") : tf("closed")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="h-64 overflow-hidden rounded-2xl border border-stone-200">
            <LocationsMap
              points={[
                {
                  id: location.id,
                  name: location.name,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  href: directions,
                  subtitle: location.address,
                },
              ]}
              linkLabel={t("directions")}
            />
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <h2 className="mb-4 text-xl font-bold">{t("title")}</h2>
            <BookingForm locationId={location.id} hours={location.hours} settings={settings} />
          </Card>
        </div>
      </div>
    </div>
  );
}
