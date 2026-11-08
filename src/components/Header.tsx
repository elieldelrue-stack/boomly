import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export async function Header() {
  const t = await getTranslations("Header");
  const locale = await getLocale();
  const other = locale === "fr" ? "en" : "fr";

  return (
    <header className="sticky top-0 z-50 bg-cream-100/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Boomly" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-medium text-ink/75 md:flex">
          <Link href="/#comment" className="hover:text-ink">{t("how")}</Link>
          <Link href="/#tarifs" className="hover:text-ink">{t("prices")}</Link>
          <Link href="/#commercants" className="hover:text-ink">{t("shops")}</Link>
          <Link href="/#faq" className="hover:text-ink">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link href="/" locale={other} className="grid h-10 min-w-10 place-items-center rounded-full px-2 uppercase hover:bg-cream-200" aria-label={t("language")}>
            {other}
          </Link>
          <Link href="/partenaire" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-white transition hover:-translate-y-0.5">
            {t("partner")}
          </Link>
        </div>
      </div>
    </header>
  );
}
