import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const t = await getTranslations("Admin");
  const links = [
    ["/admin", t("navDashboard")],
    ["/admin/reservations", t("navBookings")],
    ["/admin/incidents", t("navIncidents")],
    ["/admin/commerces", t("navLocations")],
    ["/admin/reglages", t("navSettings")],
  ] as const;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-brand-700">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
