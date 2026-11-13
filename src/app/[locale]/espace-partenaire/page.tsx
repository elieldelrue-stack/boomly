import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PartnerPitch } from "@/components/marketing/PartnerPitch";
import { IconArrow } from "@/components/marketing/Icons";

export async function generateMetadata() {
  const t = await getTranslations("PartnerSpace");
  return { title: `${t("metaTitle")} · Boomly` };
}

/** Page publique d'entrée des commerçants : connexion, inscription et simulateur de revenus. */
export default async function PartnerSpacePage() {
  const t = await getTranslations("PartnerSpace");

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:pt-16">
        <h1 className="font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">{t("subtitle")}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-[28px] bg-white p-6 ring-1 ring-ink/8 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold">{t("loginTitle")}</h2>
            <p className="mt-2 flex-1 text-muted">{t("loginText")}</p>
            <Link
              href="/partenaire/connexion"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-ink px-6 font-semibold text-white transition hover:-translate-y-0.5"
            >
              {t("loginCta")} <IconArrow className="h-5 w-5" />
            </Link>
          </div>
          <div className="flex flex-col rounded-[28px] bg-brand-50 p-6 ring-1 ring-brand-100 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold">{t("joinTitle")}</h2>
            <p className="mt-2 flex-1 text-muted">{t("joinText")}</p>
            <Link
              href="/partenaire/inscription"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-brand-500 px-6 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              {t("joinCta")} <IconArrow className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <PartnerPitch />
    </>
  );
}
