import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Link } from "@/i18n/navigation";
import { getBookingForTraveler } from "@/lib/booking-access";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { Alert, Card, PageShell } from "@/components/ui/form";
import { PayButton } from "@/components/travel/PayButton";
import { PaymentPoller } from "@/components/travel/PaymentPoller";
import { qrSvg } from "@/lib/qr";

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
  const { t: tokenParam, paid } = await searchParams;
  const token = typeof tokenParam === "string" ? tokenParam : "";
  const booking = await getBookingForTraveler(reference, token);
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
  const confirmed = ["paid", "dropped_off"].includes(booking.status);
  const waitingForStripe = booking.status === "pending_payment" && paid === "1";
  const qr = confirmed ? await qrSvg(booking.reference) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-muted">{t("reference")}</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{booking.reference}</p>
      </div>

      {waitingForStripe && (
        <>
          <PaymentPoller />
          <Alert kind="info">{t("confirming")}</Alert>
        </>
      )}
      {confirmed && (
        <Card className="border-green-200 bg-green-50 text-center">
          <p className="text-lg font-bold text-green-800">
            ✓ {booking.status === "dropped_off" ? t("droppedOff", { count: booking.bag_count }) : t("confirmed")}
          </p>
          <div
            className="mx-auto mt-4 w-52 rounded-xl bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
            aria-label={t("qrAlt")}
            role="img"
            dangerouslySetInnerHTML={{ __html: qr! }}
          />
          <p className="mt-3 text-sm text-green-900">{t("showQr")}</p>
        </Card>
      )}
      {booking.status === "picked_up" && <Alert kind="success">{t("pickedUp")}</Alert>}
      {booking.status === "expired" && <Alert>{t("expired")}</Alert>}
      {booking.status === "cancelled" && <Alert>{t("cancelled")}</Alert>}
      {booking.status === "refunded" && <Alert>{t("refunded")}</Alert>}
      {booking.status === "pending_payment" && !waitingForStripe &&
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

      {booking.status === "pending_payment" && !expired && !waitingForStripe && (
        <PayButton reference={booking.reference} token={token} total={formatEuros(booking.total_cents, locale)} />
      )}

      <Link href={`/consignes/${loc.id}`} className="text-sm text-muted hover:underline">
        ← {t("backToLocation")}
      </Link>
    </div>
  );
}
