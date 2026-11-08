import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminBooking, signedUrls } from "@/lib/admin-data";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";
import { RefundForm, RetryTransferButton } from "@/components/admin/AdminForms";
import { Card } from "@/components/ui/form";

export default async function AdminBookingPage({ params }: PageProps<"/[locale]/admin/reservations/[reference]">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ reference: string }> }) {
  await requireAdmin();
  const { reference } = await params;
  const b = await getAdminBooking(decodeURIComponent(reference).toUpperCase());
  if (!b) notFound();
  const [t, ts, locale, format] = await Promise.all([getTranslations("AdminOps"), getTranslations("Sizes"), getLocale(), getFormatter()]);
  const eur = (c: number) => formatEuros(c, locale);
  const when = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }) : "—");
  const photos = await signedUrls("dropoff-photos", b.dropoff_photos);
  const refundable = b.total_cents - b.refunded_cents;
  const transferMissing = b.status === "picked_up" && !b.stripe_transfer_id && b.partner_share_cents > 0;

  const timeline: [string, string | null][] = [
    [t("tCreated"), b.created_at],
    [t("tPaid"), b.paid_at],
    [t("tDropped"), b.dropped_off_at],
    [t("tPicked"), b.picked_up_at],
    [t("tTransferred"), b.transferred_at],
    [t("tCancelled"), b.cancelled_at],
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/reservations" className="text-sm text-muted hover:underline">
        ← {t("allBookings")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-2xl font-bold">{b.reference}</h2>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          <Card>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">{t("customer")}</dt>
                <dd className="font-medium">{b.customer_name}</dd>
                <dd>
                  <a href={`mailto:${b.customer_email}`} className="text-brand-700 hover:underline">{b.customer_email}</a>
                </dd>
                {b.customer_phone && <dd>{b.customer_phone}</dd>}
              </div>
              <div>
                <dt className="text-muted">{t("location")}</dt>
                <dd className="font-medium">{b.location?.name}</dd>
                <dd>{b.location?.address}, {b.location?.city}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("bags")}</dt>
                <dd>
                  {[["small", b.bags_small], ["medium", b.bags_medium], ["large", b.bags_large]]
                    .filter(([, n]) => (n as number) > 0)
                    .map(([s, n]) => `${n} × ${ts(s as string)}`)
                    .join(", ")}
                </dd>
                <dd className="text-muted">{when(b.dropoff_at)} → {when(b.pickup_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("money")}</dt>
                <dd>{t("paidAmount", { amount: eur(b.total_cents) })}</dd>
                <dd>{t("partnerAmount", { amount: eur(b.partner_share_cents) })}</dd>
                {b.refunded_cents > 0 && <dd className="text-red-700">{t("refundedAmount", { amount: eur(b.refunded_cents) })}</dd>}
                {b.partner_reversed_cents > 0 && <dd className="text-red-700">{t("reversedAmount", { amount: eur(b.partner_reversed_cents) })}</dd>}
                {b.late_fee_paid_at && <dd>{t("lateAmount", { amount: eur(b.late_fee_cents) })}</dd>}
                {b.late_fee_waived && <dd className="text-muted">{t("lateWaived")}</dd>}
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold">{t("timeline")}</h3>
            <ul className="text-sm">
              {timeline.filter(([, d]) => d).map(([label, d]) => (
                <li key={label} className="flex justify-between gap-3 border-b border-ink/5 py-1.5 last:border-0">
                  <span>{label}</span>
                  <span className="text-muted">{when(d)}</span>
                </li>
              ))}
            </ul>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          {b.incidents?.length > 0 && (
            <Card>
              <h3 className="mb-2 font-semibold">{t("incidents")}</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {b.incidents.map((i: { id: number; type: string; status: string; description: string }) => (
                  <li key={i.id}>
                    <Link href={`/admin/incidents/${i.id}`} className="font-medium text-brand-700 hover:underline">
                      #{i.id} · {t(`type_${i.type}`)} · {t(`istatus_${i.status}`)}
                    </Link>
                    <p className="text-muted">{i.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {refundable > 0 && b.stripe_payment_intent_id && (
            <Card>
              <h3 className="mb-3 font-semibold">{t("refundTitle")}</h3>
              <RefundForm bookingId={b.id} maxLabel={eur(refundable)} transferred={!!b.stripe_transfer_id} />
            </Card>
          )}
          {transferMissing && (
            <Card>
              <h3 className="mb-2 font-semibold text-amber-800">{t("transferMissing")}</h3>
              <RetryTransferButton bookingId={b.id} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
