import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { listIncidents } from "@/lib/admin-data";

export default async function AdminIncidentsPage() {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Incidents />
    </Suspense>
  );
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-900",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-stone-200 text-stone-700",
};

async function Incidents() {
  await requireAdmin();
  const [t, format, rows] = await Promise.all([getTranslations("AdminOps"), getFormatter(), listIncidents()]);
  if (rows.length === 0) return <p className="text-muted">{t("noIncidents")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((i) => {
        const booking = i.booking as unknown as { reference: string; customer_name: string; location: { name: string } | null } | null;
        return (
          <li key={i.id}>
            <Link href={`/admin/incidents/${i.id}`} className="block rounded-2xl border border-stone-200 p-4 hover:border-brand-500">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{t(`istatus_${i.status}`)}</span>
                <span className="font-semibold">{t(`type_${i.type}`)}</span>
                <span className="text-sm text-muted">
                  · {booking?.location?.name} · {booking?.reference} · {format.dateTime(new Date(i.created_at), { dateStyle: "medium" })}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm">{i.description}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
