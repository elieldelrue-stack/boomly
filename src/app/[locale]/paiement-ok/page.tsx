import { getTranslations } from "next-intl/server";
import { Card, PageShell } from "@/components/ui/form";

export const metadata = { robots: { index: false } };

export default async function PaymentOkPage() {
  const t = await getTranslations("Handover");
  return (
    <PageShell>
      <Card className="border-green-200 bg-green-50 text-center">
        <p className="text-2xl font-bold text-green-800">✓ {t("lateThanksTitle")}</p>
        <p className="mt-2 text-green-900">{t("lateThanksText")}</p>
      </Card>
    </PageShell>
  );
}
