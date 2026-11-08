import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminStats } from "@/lib/admin-data";
import { formatEuros } from "@/lib/pricing";
import { Card } from "@/components/ui/form";

export default async function AdminDashboardPage() {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await requireAdmin();
  const [t, locale, stats] = await Promise.all([getTranslations("AdminOps"), getLocale(), getAdminStats()]);
  const eur = (c: number) => formatEuros(c, locale);
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" }).format(new Date(`${m}-15T12:00:00Z`));
  const alerts = [
    { n: stats.openIncidents, label: t("alertIncidents", { count: stats.openIncidents }), href: "/admin/incidents" },
    { n: stats.pendingLocations, label: t("alertPending", { count: stats.pendingLocations }), href: "/admin/commerces" },
    { n: stats.failedTransfers, label: t("alertTransfers", { count: stats.failedTransfers }), href: "/admin/reservations" },
  ].filter((a) => a.n > 0);

  return (
    <div className="flex flex-col gap-6">
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Link key={a.href} href={a.href} className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">
              ⚠ {a.label}
            </Link>
          ))}
        </div>
      )}
      <Card>
        <h2 className="text-lg font-semibold">{t("statsTitle")}</h2>
        <p className="text-sm text-muted">{t("statsHint")}</p>
        {stats.months.length === 0 ? (
          <p className="mt-4 text-muted">{t("statsEmpty")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 text-left font-medium">{t("month")}</th>
                  <th className="py-2 font-medium">{t("bookings")}</th>
                  <th className="py-2 font-medium">{t("revenue")}</th>
                  <th className="py-2 font-medium">{t("refunds")}</th>
                  <th className="py-2 font-medium">{t("partners")}</th>
                  <th className="py-2 font-medium">{t("boomly")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {stats.months.map((m) => (
                  <tr key={m.month}>
                    <td className="py-2 text-left first-letter:uppercase">{monthLabel(m.month)}</td>
                    <td className="py-2">{m.bookings}</td>
                    <td className="py-2">{eur(m.revenueCents)}</td>
                    <td className="py-2">{m.refundsCents ? `− ${eur(m.refundsCents)}` : "—"}</td>
                    <td className="py-2">{eur(m.partnerCents)}</td>
                    <td className="py-2 font-semibold">{eur(m.boomlyCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
