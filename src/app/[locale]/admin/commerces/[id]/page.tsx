import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { getHours, LOCATION_COLUMNS } from "@/lib/partner-data";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatusActions } from "@/components/admin/StatusActions";
import { getLocationStats } from "@/lib/admin-data";
import { deleteReviewAction } from "@/lib/actions/admin";
import { formatEuros } from "@/lib/pricing";
import { getLocale } from "next-intl/server";
import { Card } from "@/components/ui/form";
import type { Location, Profile } from "@/lib/types";

export default async function AdminLocationPage({ params }: PageProps<"/[locale]/admin/commerces/[id]">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const t = await getTranslations("Admin");
  const tTypes = await getTranslations("BusinessTypes");
  const tDays = await getTranslations("Weekdays");
  const tf = await getTranslations("LocationForm");
  const format = await getFormatter();

  const supabase = await createClient();
  const { data } = await supabase
    .from("locations")
    .select(`${LOCATION_COLUMNS}, partner:profiles(full_name, email, phone)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const location = data as unknown as Location & { partner: Pick<Profile, "full_name" | "email" | "phone"> | null };
  const hours = await getHours(id);
  const stats = await getLocationStats(id);
  const locale = await getLocale();
  const ta = await getTranslations("AdminOps");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/commerces" className="text-sm text-muted hover:underline">
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{location.name}</h2>
        <StatusBadge status={location.status} />
        <span className="text-muted">{tTypes(location.business_type)}</span>
      </div>
      {location.status_reason && <p className="text-sm text-muted">« {location.status_reason} »</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">{t("partner")}</dt>
                <dd className="font-medium">{location.partner?.full_name}</dd>
                <dd className="text-sm">
                  <a href={`mailto:${location.partner?.email}`} className="text-brand-700 hover:underline">
                    {location.partner?.email}
                  </a>
                </dd>
                {location.partner?.phone && (
                  <dd className="text-sm">
                    <a href={`tel:${location.partner.phone}`} className="hover:underline">
                      {location.partner.phone}
                    </a>
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm text-muted">{t("siret")}</dt>
                <dd className="font-mono">{location.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</dd>
                <dd className="text-sm">
                  <a
                    href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${location.siret}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {t("checkSiret")} ↗
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">{t("address")}</dt>
                <dd>
                  {location.address}, {location.postal_code} {location.city}
                </dd>
                <dd className="text-sm">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=18/${location.latitude}/${location.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {t("viewMap")} ↗
                  </a>
                </dd>
                {location.phone && <dd className="text-sm">{location.phone}</dd>}
              </div>
              <div>
                <dt className="text-sm text-muted">{t("capacity")}</dt>
                <dd>{location.capacity_per_day}</dd>
                <dt className="mt-3 text-sm text-muted">Stripe</dt>
                <dd className={location.stripe_payouts_enabled ? "text-green-700" : "text-amber-700"}>
                  {location.stripe_payouts_enabled
                    ? t("stripeReady")
                    : location.stripe_account_id
                      ? t("stripePending")
                      : t("stripeMissing")}
                </dd>
                <dt className="mt-3 text-sm text-muted">{t("colDate")}</dt>
                <dd>{format.dateTime(new Date(location.created_at), { dateStyle: "medium", timeStyle: "short" })}</dd>
              </div>
            </dl>
            {location.description && (
              <div className="mt-4">
                <p className="text-sm text-muted">{t("description")}</p>
                <p className="whitespace-pre-line">{location.description}</p>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold">{t("hours")}</h3>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const slots = hours.filter((h) => h.weekday === d);
                return (
                  <li key={d} className="flex justify-between gap-4 border-b border-stone-100 py-1">
                    <span>{tDays(String(d))}</span>
                    <span className="text-muted">
                      {slots.length ? slots.map((s) => `${s.opens_at}–${s.closes_at}`).join(", ") : tf("closed")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h3 className="mb-3 font-semibold">{t("photos")}</h3>
            {location.photos.length === 0 ? (
              <p className="text-muted">{t("noPhotos")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {location.photos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="h-fit">
            <h3 className="mb-3 font-semibold">{t("actions")}</h3>
            <StatusActions id={location.id} status={location.status} />
          </Card>
          <Card>
            <h3 className="mb-3 font-semibold">{ta("locationStats")}</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">{ta("bookings")}</dt><dd className="text-lg font-semibold">{stats.bookings}</dd></div>
              <div><dt className="text-muted">{ta("pickedUpCount")}</dt><dd className="text-lg font-semibold">{stats.pickedUp}</dd></div>
              <div><dt className="text-muted">{ta("revenue")}</dt><dd className="text-lg font-semibold">{formatEuros(stats.revenueCents, locale)}</dd></div>
              <div><dt className="text-muted">{ta("partners")}</dt><dd className="text-lg font-semibold">{formatEuros(stats.partnerCents, locale)}</dd></div>
              <div><dt className="text-muted">{ta("rating")}</dt><dd className="text-lg font-semibold">{stats.ratingAvg ?? "—"} <span className="text-sm font-normal text-muted">({stats.reviews.length})</span></dd></div>
            </dl>
          </Card>
          {stats.reviews.length > 0 && (
            <Card>
              <h3 className="mb-3 font-semibold">{ta("reviews")}</h3>
              <ul className="flex flex-col gap-3 text-sm">
                {stats.reviews.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2 last:border-0">
                    <div>
                      <p className="text-amber-500">{"★".repeat(r.rating)}<span className="ml-2 text-muted">{r.customer_first_name}</span></p>
                      {r.comment && <p>{r.comment}</p>}
                    </div>
                    <form action={deleteReviewAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="text-red-700 underline">{ta("deleteReview")}</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
