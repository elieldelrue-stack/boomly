import { Suspense } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { searchBookings } from "@/lib/admin-data";
import { formatEuros } from "@/lib/pricing";
import { TZ } from "@/lib/paris-time";
import { BookingStatusBadge } from "@/components/ui/BookingStatusBadge";
import { inputClass } from "@/components/ui/form";

export default async function AdminBookingsPage({ searchParams }: PageProps<"/[locale]/admin/reservations">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Bookings searchParams={searchParams} />
    </Suspense>
  );
}

async function Bookings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { q: raw } = await searchParams;
  const q = typeof raw === "string" ? raw.slice(0, 100) : "";
  const [t, locale, format, rows] = await Promise.all([getTranslations("AdminOps"), getLocale(), getFormatter(), searchBookings(q)]);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className={`${inputClass} max-w-md`} />
        <button type="submit" className="h-11 rounded-xl bg-brand-600 px-4 font-semibold text-white">
          {t("search")}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="text-muted">{t("noBookings")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <tbody className="divide-y divide-stone-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono font-semibold">
                    <Link href={`/admin/reservations/${b.reference}`} className="text-brand-700 hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {b.customer_name}
                    <span className="block text-xs text-muted">{b.customer_email}</span>
                  </td>
                  <td className="px-4 py-3">{b.location?.name}</td>
                  <td className="px-4 py-3">{format.dateTime(new Date(b.dropoff_at), { timeZone: TZ, dateStyle: "medium" })}</td>
                  <td className="px-4 py-3">{formatEuros(b.total_cents, locale)}</td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
