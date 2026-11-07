import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Link href="/" className="mt-6 inline-block font-semibold text-brand-600 hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}
