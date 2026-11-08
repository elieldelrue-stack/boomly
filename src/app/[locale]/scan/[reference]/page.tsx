import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Card, PageShell } from "@/components/ui/form";

export const metadata = { robots: { index: false } };

// Adresse contenue dans le code QR. Commerçant connecté : ouverture directe de la réservation.
export default async function ScanPage({ params }: PageProps<"/[locale]/scan/[reference]">) {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Scan params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Scan({ params }: { params: Promise<{ reference: string }> }) {
  const { reference: raw } = await params;
  const reference = decodeURIComponent(raw).toUpperCase();
  const locale = await getLocale();
  const profile = await getCurrentProfile();
  if (profile && /^BMY-[A-Z0-9]{6}$/.test(reference)) {
    return redirect({ href: `/partenaire/reservations/${reference}`, locale });
  }
  const t = await getTranslations("Handover");
  return (
    <Card className="text-center">
      <p className="font-mono text-2xl font-bold tracking-wider">{reference.slice(0, 10)}</p>
      <p className="mt-3">{t("scanVisitor")}</p>
      <Link href="/partenaire/connexion" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
        {t("scanPartnerLogin")}
      </Link>
    </Card>
  );
}
