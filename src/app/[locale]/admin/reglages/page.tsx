import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Card } from "@/components/ui/form";
import type { Settings } from "@/lib/types";

export default async function AdminSettingsPage() {
  const t = await getTranslations("Common");
  return (
    <Suspense fallback={<p className="text-muted">{t("loading")}</p>}>
      <SettingsEditor />
    </Suspense>
  );
}

async function SettingsEditor() {
  await requireAdmin();
  const t = await getTranslations("Admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("price_small_cents, price_medium_cents, price_large_cents, partner_share_percent, currency")
    .single<Settings>();
  if (!data) throw new Error("Réglages introuvables");

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold">{t("settingsTitle")}</h2>
      <p className="mt-1 mb-5 text-sm text-muted">{t("settingsHint")}</p>
      <Card>
        <SettingsForm settings={{ ...data, partner_share_percent: Number(data.partner_share_percent) }} />
      </Card>
    </div>
  );
}
