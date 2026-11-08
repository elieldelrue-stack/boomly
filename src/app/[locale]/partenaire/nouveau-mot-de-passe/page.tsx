import { getTranslations } from "next-intl/server";
import { NewPasswordForm } from "@/components/partner/AuthForms";
import { Card, PageShell } from "@/components/ui/form";

export default async function NewPasswordPage() {
  const t = await getTranslations("Auth");
  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold">{t("newPasswordTitle")}</h1>
        <Card className="mt-6">
          <NewPasswordForm />
        </Card>
      </div>
    </PageShell>
  );
}
