import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getMyLocation } from "@/lib/partner-data";
import { signOutAction } from "@/lib/actions/auth";
import { Alert, Card, PageShell } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StripeCard } from "@/components/partner/StripeCard";
import { syncStripeStatus } from "@/lib/stripe-connect";
import { getClosures } from "@/lib/partner-bookings";
import { TodayBookings, EarningsCard } from "@/components/partner/DashboardSections";
import { AvailabilityCard } from "@/components/partner/AvailabilityCard";

export default async function PartnerHomePage({ searchParams }: PageProps<"/[locale]/partenaire">) {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getLocale();
  const profile = await getCurrentProfile();
  if (!profile) return redirect({ href: "/partenaire/connexion", locale });

  const t = await getTranslations("Partner");
  const ta = await getTranslations("Auth");
  const { location } = await getMyLocation(profile.id);
  const { saved, stripe: stripeReturn } = await searchParams;

  // Au retour du formulaire Stripe (ou tant que ce n'est pas terminé), on relit l'état du compte.
  let stripeStatus = {
    detailsSubmitted: location?.stripe_details_submitted ?? false,
    payoutsEnabled: location?.stripe_payouts_enabled ?? false,
  };
  if (location?.stripe_account_id && !stripeStatus.payoutsEnabled) {
    try {
      stripeStatus = await syncStripeStatus(location.id, location.stripe_account_id);
    } catch (e) {
      console.error("Lecture du compte Stripe :", (e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          {profile.full_name && <p className="mt-1 text-muted">{t("hello", { name: profile.full_name })}</p>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {profile.role === "admin" && (
            <Link href="/admin" className="rounded-full bg-ink px-3 py-1.5 font-semibold text-white">
              {t("adminLink")}
            </Link>
          )}
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="text-muted underline">
              {ta("logout")}
            </button>
          </form>
        </div>
      </div>

      {saved && <Alert kind="success">{t("saved")}</Alert>}
      {stripeReturn === "return" && stripeStatus.payoutsEnabled && <Alert kind="success">{t("paymentsReady")}</Alert>}

      {!location ? (
        <Card className="border-brand-100 bg-brand-50">
          <h2 className="text-xl font-semibold">{t("noLocationTitle")}</h2>
          <p className="mt-2 text-muted">{t("noLocationText")}</p>
          <Link
            href="/partenaire/commerce"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
          >
            {t("noLocationCta")}
          </Link>
        </Card>
      ) : (
        <Card className={location.status === "active" ? "order-last" : ""}>
          <p className="text-sm font-medium text-muted">{t("statusTitle")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">{location.name}</h2>
            <StatusBadge status={location.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {location.address}, {location.postal_code} {location.city} · {t("capacity", { count: location.capacity_per_day })}
          </p>
          <p className="mt-4">{t(`status_${location.status}`)}</p>
          {location.status_reason && location.status !== "active" && (
            <p className="mt-1 text-sm text-muted">{t("reason", { reason: location.status_reason })}</p>
          )}
          <Link
            href="/partenaire/commerce"
            className="mt-5 inline-flex h-11 items-center rounded-xl border border-stone-300 px-5 font-semibold hover:bg-stone-50"
          >
            {t("edit")}
          </Link>
        </Card>
      )}

      {location && location.status === "active" && (
        <>
          <Link
            href="/partenaire/scanner"
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-lg font-bold text-white shadow-sm hover:bg-brand-700"
          >
            📷 {t("scan")}
          </Link>
          <TodayBookings locationId={location.id} />
          <Availability locationId={location.id} />
          <EarningsCard locationId={location.id} />
        </>
      )}

      {location && (
        <StripeCard
          hasAccount={!!location.stripe_account_id}
          detailsSubmitted={stripeStatus.detailsSubmitted}
          payoutsEnabled={stripeStatus.payoutsEnabled}
        />
      )}
    </div>
  );
}

async function Availability({ locationId }: { locationId: string }) {
  const { closures, pausedNow } = await getClosures(locationId);
  return <AvailabilityCard closures={closures} pausedNow={pausedNow} />;
}
