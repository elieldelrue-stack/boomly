import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";

export async function Footer() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Logo className="text-ink" />
          <p className="max-w-md">{t("tagline")}</p>
        </div>
        <p>© 2026 Boomly. {t("rights")}</p>
      </div>
    </footer>
  );
}
