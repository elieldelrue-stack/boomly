import { Suspense } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Location, LocationStatus } from "@/lib/types";

export default async function AdminLocationsPage() {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <LocationsList />
    </Suspense>
  );
}

const ORDER: LocationStatus[] = ["pending", "active", "suspended", "refused"];

async function LocationsList() {
  await requireAdmin();
  const t = await getTranslations("Admin");
  const tTypes = await getTranslations("BusinessTypes");
  const tStatus = await getTranslations("Status");
  const format = await getFormatter();

  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select("id, name, city, business_type, status, created_at")
    .order("created_at", { ascending: false });
  const locations = (data ?? []) as Pick<Location, "id" | "name" | "city" | "business_type" | "status" | "created_at">[];

  if (locations.length === 0) return <p className="text-muted">{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-8">
      {ORDER.map((status) => {
        const group = locations.filter((l) => l.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status}>
            <h2 className="mb-3 text-lg font-semibold">
              {tStatus(status)} <span className="text-muted">({group.length})</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-stone-50 text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("colName")}</th>
                    <th className="px-4 py-2 font-medium">{t("colCity")}</th>
                    <th className="px-4 py-2 font-medium">{t("colType")}</th>
                    <th className="px-4 py-2 font-medium">{t("colDate")}</th>
                    <th className="px-4 py-2 font-medium">{t("colStatus")}</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {group.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3 font-medium">{l.name}</td>
                      <td className="px-4 py-3">{l.city}</td>
                      <td className="px-4 py-3">{tTypes(l.business_type)}</td>
                      <td className="px-4 py-3">{format.dateTime(new Date(l.created_at), { dateStyle: "medium" })}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/commerces/${l.id}`} className="font-semibold text-brand-700 hover:underline">
                          {t("view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
