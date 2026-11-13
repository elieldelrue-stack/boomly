import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/settings";
import { partnerShareCents } from "@/lib/pricing";
import { IMAGES } from "@/lib/site-config";
import { Photo } from "@/components/marketing/Photo";
import { Blob } from "@/components/marketing/Blob";
import { PartnerSimulator } from "@/components/marketing/PartnerSimulator";
import { IconArrow, IconCamera, IconQr, IconShield } from "@/components/marketing/Icons";

/** Bloc « Vous tenez un commerce ? » + simulateur de revenus (accueil et espace partenaire). */
export async function PartnerPitch() {
  const [t, settings] = await Promise.all([getTranslations("Landing"), getSettings()]);
  const partnerPerBag = partnerShareCents(settings.price_medium_cents, settings.partner_share_percent);

  return (
    <section id="commercants" className="scroll-mt-20 px-4 py-20 sm:py-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-forest-800 text-white">
        <Blob animated={false} className="absolute -top-24 -right-24 h-80 w-80 bg-forest-700" />
        <div className="relative grid gap-10 p-6 sm:p-10 md:grid-cols-2 md:p-14">
          <div>
            <p className="font-semibold text-brand-300">{t("partnerKicker")}</p>
            <h2 className="mt-2 font-display text-4xl leading-[1.02] font-extrabold sm:text-5xl">{t("partnerTitle")}</h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-white/80">{t("partnerText", { share: settings.partner_share_percent })}</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {(["partnerPoint1", "partnerPoint2", "partnerPoint3"] as const).map((k, i) => {
                const Icon = [IconQr, IconCamera, IconShield][i];
                return (
                  <li key={k} className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="pt-1">{t(k)}</span>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/partenaire/inscription"
              className="mt-8 inline-flex h-13 items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              {t("partnerCta")} <IconArrow className="h-5 w-5" />
            </Link>
          </div>
          <div className="relative">
            <Photo src={IMAGES.partner} alt={t("partnerPhotoAlt")} tone="forest" className="aspect-[4/3] w-full rounded-[32px_32px_32px_8px] md:aspect-[5/4]" />
            <div className="relative -mt-16 px-3 sm:px-6">
              <PartnerSimulator partnerCentsPerBag={partnerPerBag} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
