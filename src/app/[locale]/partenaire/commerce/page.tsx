import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyLocation } from "@/lib/partner-data";
import { LocationForm } from "@/components/partner/LocationForm";
import { PageShell } from "@/components/ui/form";

export default async function LocationPage() {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Editor />
      </Suspense>
    </PageShell>
  );
}

async function Editor() {
  const locale = await getLocale();
  const profile = await getCurrentProfile();
  if (!profile) return redirect({ href: "/partenaire/connexion", locale });

  const t = await getTranslations("LocationForm");
  const tp = await getTranslations("Partner");
  const { location, hours } = await getMyLocation(profile.id);

  return (
    <>
      <Link href="/partenaire" className="text-sm text-muted hover:underline">
        ← {tp("title")}
      </Link>
      <h1 className="mt-2 mb-6 text-3xl font-bold">{location ? t("titleEdit") : t("titleNew")}</h1>
      <LocationForm userId={profile.id} location={location} hours={hours} />
    </>
  );
}
