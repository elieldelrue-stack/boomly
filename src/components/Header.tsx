import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

export async function Header() {
  const t = await getTranslations("Header");
  const locale = await getLocale();
  const other = locale === "fr" ? "en" : "fr";

  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Boomly">
          <Logo />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/partenaire" className="text-muted hover:text-ink">
            {t("partner")}
          </Link>
          <Link
            href="/"
            locale={other}
            className="rounded-full border border-stone-300 px-3 py-1.5 hover:bg-stone-100"
          >
            {t("language")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
