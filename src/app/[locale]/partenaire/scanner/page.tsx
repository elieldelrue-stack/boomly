import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { QrScanner } from "@/components/partner/QrScanner";
import { PageShell } from "@/components/ui/form";

export default async function ScannerPage() {
  const t = await getTranslations("Scanner");
  const tp = await getTranslations("Partner");
  return (
    <PageShell>
      <Link href="/partenaire" className="text-sm text-muted hover:underline">
        ← {tp("title")}
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">{t("title")}</h1>
      <QrScanner />
    </PageShell>
  );
}
