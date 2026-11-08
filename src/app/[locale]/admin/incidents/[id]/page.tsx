import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getIncident, signedUrls } from "@/lib/admin-data";
import { formatEuros } from "@/lib/pricing";
import { ResolveIncidentForm } from "@/components/admin/AdminForms";
import { Alert, Card } from "@/components/ui/form";

export default async function AdminIncidentPage({ params }: PageProps<"/[locale]/admin/incidents/[id]">) {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

function Photos({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
        </a>
      ))}
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const incident = await getIncident(Number(id));
  if (!incident) notFound();
  const booking = incident.booking as unknown as {
    id: string; reference: string; customer_name: string; customer_email: string; status: string;
    total_cents: number; refunded_cents: number; stripe_transfer_id: string | null; dropoff_photos: string[]; location: { name: string } | null;
  };
  const [t, locale, format, incidentPhotos, dropoffPhotos] = await Promise.all([
    getTranslations("AdminOps"),
    getLocale(),
    getFormatter(),
    signedUrls("incident-photos", incident.photos),
    signedUrls("dropoff-photos", booking.dropoff_photos),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/incidents" className="text-sm text-muted hover:underline">
        ← {t("allIncidents")}
      </Link>
      <h2 className="text-2xl font-bold">
        #{incident.id} · {t(`type_${incident.type}`)}
      </h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">
            {format.dateTime(new Date(incident.created_at), { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            <Link href={`/admin/reservations/${booking.reference}`} className="font-mono text-brand-700 hover:underline">
              {booking.reference}
            </Link>{" "}
            · {booking.location?.name}
          </p>
          <p className="mt-1 text-sm">
            {booking.customer_name} · <a href={`mailto:${booking.customer_email}`} className="text-brand-700">{booking.customer_email}</a>
          </p>
          <h3 className="mt-4 font-semibold">{t("travelerSays")}</h3>
          <p className="whitespace-pre-line">{incident.description}</p>
          <Photos urls={incidentPhotos} />
          <h3 className="mt-5 font-semibold">{t("dropoffPhotos")}</h3>
          {dropoffPhotos.length ? <Photos urls={dropoffPhotos} /> : <p className="text-sm text-muted">{t("noDropoffPhotos")}</p>}
        </Card>
        <Card>
          {incident.status === "open" ? (
            <>
              <h3 className="mb-1 font-semibold">{t("handle")}</h3>
              <p className="mb-3 text-sm text-muted">
                {t("paidAmount", { amount: formatEuros(booking.total_cents, locale) })}
                {booking.refunded_cents > 0 && ` · ${t("refundedAmount", { amount: formatEuros(booking.refunded_cents, locale) })}`}
              </p>
              <ResolveIncidentForm incidentId={incident.id} transferred={!!booking.stripe_transfer_id} />
            </>
          ) : (
            <Alert kind={incident.status === "resolved" ? "success" : "info"}>
              <p className="font-semibold">{t(`istatus_${incident.status}`)}</p>
              <p className="mt-1 whitespace-pre-line">{incident.decision}</p>
              {incident.refunded_cents > 0 && <p className="mt-1">{t("refundedAmount", { amount: formatEuros(incident.refunded_cents, locale) })}</p>}
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
