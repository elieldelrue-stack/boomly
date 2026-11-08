import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Link } from "@/i18n/navigation";
import { getBookingForTraveler } from "@/lib/booking-access";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { Alert, Card, PageShell } from "@/components/ui/form";

export const metadata = { robots: { index: false } };

export default async function ReservationPage({ params, searchParams }: PageProps<"/[locale]/reservation/[reference]">) {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Reservation params={params} searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Reservation({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { reference } = await params;
  const { t: token } = await searchParams;
  const booking = await getBookingForTraveler(reference, typeof token === "string" ? token : "");
  if (!booking) notFound();

  const [t, ts, format, locale] = await Promise.all([
    getTranslations("Reservation"),
    getTranslations("Sizes"),
    getFormatter(),
    getLocale(),
  ]);
  const when = (iso: string) =>
    format.dateTime(new Date(iso), { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const expired = booking.status === "pending_payment" && booking.expires_at && new Date(booking.expires_at) < new Date();
  const lines = (
    [
      ["small", booking.bags_small, booking.price_small_cents],
      ["medium", booking.bags_medium, booking.price_medium_cents],
      ["large", booking.bags_large, booking.price_large_cents],
    ] as const
  ).filter(([, n]) => n > 0);
  const loc = booking.location;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted">{t("reference")}</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{booking.reference}</p>
      </div>

      {booking.status === "pending_payment" &&
        (expired ? (
          <Alert>{t("expired")}</Alert>
        ) : (
          <Alert kind="info">{t("pendingPayment")}</Alert>
        ))}

      <Card>
        <h1 className="text-xl font-bold">{loc.name}</h1>
        <p className="text-muted">
          {loc.address}, {loc.postal_code} {loc.city}
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">{t("dropoff")}</dt>
            <dd className="font-medium first-letter:uppercase">{when(booking.dropoff_at)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("pickup")}</dt>
            <dd className="font-medium first-letter:uppercase">{when(booking.pickup_at)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t("priceDetails")}</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {lines.map(([size, n, price]) => (
            <li key={size} className="flex justify-between gap-3">
              <span>
                {n} × {ts(size)} × {t("days", { count: booking.days })}
              </span>
              <span>{formatEuros(n * price * booking.days, locale)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-bold">
          <span>{t("total")}</span>
          <span>{formatEuros(booking.total_cents, locale)}</span>
        </div>
      </Card>

      {booking.status === "pending_payment" && !expired && (
        <div>
          <button
            type="button"
            disabled
            className="h-12 w-full rounded-xl bg-brand-600 px-5 font-semibold text-white opacity-60"
          >
            {t("pay", { total: formatEuros(booking.total_cents, locale) })}
          </button>
          <p className="mt-2 text-center text-sm text-muted">{t("paySoon")}</p>
        </div>
      )}

      <Link href={`/consignes/${loc.id}`} className="text-sm text-muted hover:underline">
        ← {t("backToLocation")}
      </Link>
    </div>
  );
}
