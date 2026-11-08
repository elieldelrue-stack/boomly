import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getEarnings, getTodayBookings } from "@/lib/partner-bookings";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { Card } from "@/components/ui/form";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";

/** Dépôts et retraits du jour, et bagages actuellement en garde. */
export async function TodayBookings({ locationId }: { locationId: string }) {
  const t = await getTranslations("Partner");
  const format = await getFormatter();
  const bookings = await getTodayBookings(locationId);
  const time = (iso: string) => format.dateTime(new Date(iso), { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const day = (iso: string) => format.dateTime(new Date(iso), { timeZone: TZ, day: "numeric", month: "short" });
  const inStore = bookings.filter((b) => b.status === "dropped_off").reduce((n, b) => n + b.bag_count, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("todayTitle")}</h2>
        <span className="text-sm text-muted">{t("inStore", { count: inStore })}</span>
      </div>
      {bookings.length === 0 ? (
        <p className="mt-3 text-muted">{t("todayEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/5">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/partenaire/reservations/${b.reference}`} className="flex items-center justify-between gap-3 py-3 hover:bg-cream-100">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {b.customer_name} · {t("bags", { count: b.bag_count })}
                  </p>
                  <p className="text-sm text-muted">
                    {t("dropoffAt", { time: time(b.dropoff_at) })} · {t("pickupAt", { time: `${day(b.pickup_at)} ${time(b.pickup_at)}` })}
                  </p>
                  <p className="font-mono text-xs text-muted">{b.reference}</p>
                </div>
                <BookingStatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Gains par mois (versés après chaque retrait). */
export async function EarningsCard({ locationId }: { locationId: string }) {
  const t = await getTranslations("Partner");
  const locale = await getLocale();
  const { months, upcomingCents } = await getEarnings(locationId);
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }).format(new Date(`${m}-15T12:00:00Z`));

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t("earningsTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("earningsUpcoming", { amount: formatEuros(upcomingCents, locale) })}</p>
      {months.length === 0 ? (
        <p className="mt-3 text-muted">{t("earningsEmpty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/5">
          {months.map((m) => (
            <li key={m.month} className="flex justify-between gap-3 py-2">
              <span className="first-letter:uppercase">
                {monthLabel(m.month)} <span className="text-sm text-muted">· {t("bookingsCount", { count: m.count })}</span>
              </span>
              <span className="font-semibold">{formatEuros(m.cents, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
