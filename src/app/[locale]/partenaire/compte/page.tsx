import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DeleteAccount } from "@/components/partner/DeleteAccount";
import { Card, PageShell } from "@/components/ui/form";

export default async function AccountPage() {
  const t = await getTranslations("Common");
  return (
    <PageShell>
      <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
        <Account />
      </Suspense>
    </PageShell>
  );
}

async function Account() {
  const locale = await getLocale();
  const profile = await getCurrentProfile();
  if (!profile) return redirect({ href: "/partenaire/connexion", locale });
  const [t, tp] = await Promise.all([getTranslations("Account"), getTranslations("Partner")]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/partenaire" className="text-sm text-muted hover:underline">
        ← {tp("title")}
      </Link>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Card>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{t("name")}</dt>
            <dd className="font-medium">{profile.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("email")}</dt>
            <dd className="font-medium">{profile.email}</dd>
          </div>
        </dl>
        <Link href="/partenaire/nouveau-mot-de-passe" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline">
          {t("changePassword")}
        </Link>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">{t("exportTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("exportText")}</p>
        {/* Téléchargement d'un fichier (route API), pas une page : un lien classique est voulu */}
        <a
          download
          href="/api/partner/export"
          className="mt-4 inline-flex h-12 items-center rounded-full bg-white px-6 font-semibold ring-1 ring-ink/12 transition hover:-translate-y-0.5 hover:ring-ink/25"
        >
          {t("exportButton")}
        </a>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">{t("deleteTitle")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">{t("deleteText")}</p>
        {profile.role === "admin" ? <p className="text-sm text-muted">{t("adminNote")}</p> : <DeleteAccount />}
      </Card>
    </div>
  );
}
