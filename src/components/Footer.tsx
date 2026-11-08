import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CITIES, CONTACT_EMAIL, SOCIALS } from "@/lib/site-config";
import { IconFacebook, IconGlobe, IconInstagram, IconLinkedin, IconTiktok } from "./marketing/Icons";
import { Logo } from "./Logo";

const SOCIAL_ICONS = { instagram: IconInstagram, tiktok: IconTiktok, linkedin: IconLinkedin, facebook: IconFacebook } as const;

export async function Footer() {
  const t = await getTranslations("Footer");
  const locale = await getLocale();
  const socials = (Object.entries(SOCIALS) as [keyof typeof SOCIALS, string][]).filter(([, url]) => url);

  return (
    <footer className="mt-auto bg-forest-900 text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/70">{t("tagline")}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(([name, url]) => {
                const Icon = SOCIAL_ICONS[name];
                return (
                  <a key={name} href={url} target="_blank" rel="noreferrer" aria-label={name} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-brand-500">
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">{t("travellers")}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link href="/recherche" className="hover:text-white">{t("find")}</Link></li>
            <li><Link href="/#comment" className="hover:text-white">{t("how")}</Link></li>
            <li><Link href="/#tarifs" className="hover:text-white">{t("prices")}</Link></li>
            <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">{t("shops")}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link href="/partenaire/inscription" className="hover:text-white">{t("become")}</Link></li>
            <li><Link href="/partenaire/connexion" className="hover:text-white">{t("partnerLogin")}</Link></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{t("contact")}</a></li>
          </ul>
        </div>
        <div>
          <p className="font-display text-lg font-bold text-white">{t("cities")}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {CITIES.map((c) => (
              <li key={c.name}>
                <Link
                  href={`/recherche?lat=${c.lat}&lng=${c.lng}&q=${encodeURIComponent(c.name)}`}
                  className="inline-block rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Boomly. {t("rights")}</p>
          <div className="flex items-center gap-1">
            <IconGlobe className="mr-1 h-4 w-4" />
            {(["fr", "en"] as const).map((l) => (
              <Link key={l} href="/" locale={l} className={`rounded-full px-3 py-1 ${l === locale ? "bg-white/15 font-semibold text-white" : "hover:text-white"}`}>
                {l === "fr" ? "Français" : "English"}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
