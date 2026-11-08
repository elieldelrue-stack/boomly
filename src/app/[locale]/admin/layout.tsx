import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const t = await getTranslations("Admin");
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/admin" className="hover:text-brand-700">
            {t("navLocations")}
          </Link>
          <Link href="/admin/reglages" className="hover:text-brand-700">
            {t("navSettings")}
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
