import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/partner/AuthForms";
import { Card, PageShell } from "@/components/ui/form";

export default async function LoginPage({ searchParams }: PageProps<"/[locale]/partenaire/connexion">) {
  const t = await getTranslations("Auth");
  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
        <p className="mt-2 text-muted">{t("loginSubtitle")}</p>
        <Card className="mt-6">
          <Suspense fallback={<LoginForm />}>
            <LoginWithError searchParams={searchParams} />
          </Suspense>
        </Card>
        <p className="mt-4 text-center text-sm">
          <Link href="/partenaire/mot-de-passe-oublie" className="text-muted underline">
            {t("forgotLink")}
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/partenaire/inscription" className="font-semibold text-brand-700 hover:underline">
            {t("goSignup")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}

async function LoginWithError({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { error } = await searchParams;
  return <LoginForm callbackError={error === "callback"} />;
}
