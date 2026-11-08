import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/partner/AuthForms";
import { Card, PageShell } from "@/components/ui/form";

export default async function SignupPage() {
  const t = await getTranslations("Auth");
  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">{t("signupTitle")}</h1>
        <p className="mt-2 text-muted">{t("signupSubtitle")}</p>
        <Card className="mt-6">
          <SignupForm />
        </Card>
        <p className="mt-6 text-center text-sm text-muted">
          {t("hasAccount")}{" "}
          <Link href="/partenaire/connexion" className="font-semibold text-brand-700 hover:underline">
            {t("goLogin")}
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
