import { Suspense } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getPartnerBooking, signedPhotoUrls } from "@/lib/partner-bookings";
import { createClient } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { HandoverPanel } from "@/components/partner/HandoverPanel";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";
import { Alert, Card, PageShell } from "@/components/ui/form";

export default async function PartnerReservationPage({ params }: PageProps<"/[locale]/partenaire/reservations/[reference]">) {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Reservation params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Reservation({ params }: { params: Promise<{ reference: string }> }) {
  const locale = await getLocale();
  const profile = await getCurrentProfile();
  const { reference: raw } = await params;
  const reference = decodeURIComponent(raw).toUpperCase();
  if (!profile) return redirect({ href: "/partenaire/connexion", locale });

  const [t, ts, format] = await Promise.all([getTranslations("Handover"), getTranslations("Sizes"), getFormatter()]);
  const booking = await getPartnerBooking(reference);

  if (!booking) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>{t("notFound", { reference })}</Alert>
        <Link href="/partenaire/scanner" className="font-semibold text-brand-700 hover:underline">
          ← {t("scanAnother")}
        </Link>
      </div>
    );
  }

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { timeZone: TZ, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const photos = await signedPhotoUrls(booking.dropoff_photos);

  let lateFee: { days: number; cents: number; label: string } | null = null;
  if (booking.status === "dropped_off") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("booking_late_fee", { p_booking_id: booking.id });
    const fee = data as { late_days: number; fee_cents: number } | null;
    if (fee && fee.fee_cents > 0) lateFee = { days: fee.late_days, cents: fee.fee_cents, label: formatEuros(fee.fee_cents, locale) };
  }

  const sizes = (
    [
      ["small", booking.bags_small],
      ["medium", booking.bags_medium],
      ["large", booking.bags_large],
    ] as const
  ).filter(([, n]) => n > 0);
  const labels = Array.from({ length: booking.bag_count }, (_, i) => `${booking.reference}-${i + 1}`);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/partenaire" className="text-sm text-muted hover:underline">
        ← {t("back")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold tracking-wider">{booking.reference}</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <Card>
        <p className="text-xl font-semibold">{booking.customer_name}</p>
        {booking.customer_phone && (
          <a href={`tel:${booking.customer_phone}`} className="text-brand-700 hover:underline">
            {booking.customer_phone}
          </a>
        )}
        <ul className="mt-3 flex flex-wrap gap-2">
          {sizes.map(([size, n]) => (
            <li key={size} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium">
              {n} × {ts(size)}
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{t("plannedDropoff")}</dt>
            <dd className="font-medium first-letter:uppercase">{when(booking.dropoff_at)}</dd>
            {booking.dropped_off_at && <dd className="text-green-700">✓ {t("doneAt", { when: when(booking.dropped_off_at) })}</dd>}
          </div>
          <div>
            <dt className="text-muted">{t("plannedPickup")}</dt>
            <dd className="font-medium first-letter:uppercase">{when(booking.pickup_at)}</dd>
            {booking.picked_up_at && <dd className="text-green-700">✓ {t("doneAt", { when: when(booking.picked_up_at) })}</dd>}
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">{t("yourShare", { amount: formatEuros(booking.partner_share_cents, locale) })}</p>
      </Card>

      {(booking.status === "dropped_off" || booking.status === "picked_up") && (
        <Card>
          <h2 className="font-semibold">{t("labelsTitle")}</h2>
          <p className="text-sm text-muted">{t("labelsHint")}</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {labels.map((l) => (
              <li key={l} className="rounded-lg border-2 border-dashed border-stone-300 px-3 py-2 text-center font-mono font-bold">
                {l}
              </li>
            ))}
          </ul>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                </a>
              ))}
            </div>
          )}
        </Card>
      )}

      {["paid", "dropped_off"].includes(booking.status) ? (
        <Card>
          <HandoverPanel
            bookingId={booking.id}
            locationId={booking.location_id}
            status={booking.status}
            bagCount={booking.bag_count}
            lateFee={lateFee}
            lateFeePaid={!!booking.late_fee_paid_at}
          />
        </Card>
      ) : booking.status === "picked_up" ? (
        <Alert kind="success">
          {t("pickedUp", {
            amount: formatEuros(booking.partner_share_cents + (booking.late_fee_paid_at ? booking.late_fee_partner_cents : 0), locale),
          })}
        </Alert>
      ) : (
        <Alert>{t("doNotAccept")}</Alert>
      )}
    </div>
  );
}
