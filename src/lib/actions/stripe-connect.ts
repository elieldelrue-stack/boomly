"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { createRecipientAccount, onboardingLink } from "@/lib/stripe-connect";
import { siteUrl } from "@/lib/site-url";
import { safeLocale } from "@/lib/locale";
import type { FormState } from "@/lib/types";

/** Crée (si besoin) le compte Stripe Express du commerçant puis l'envoie sur le formulaire Stripe. */
export async function startStripeOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notAuthenticated" };

  const { data: location } = await supabase
    .from("locations")
    .select("id, name, stripe_account_id, partner:profiles(email)")
    .eq("partner_id", auth.user.id)
    .maybeSingle();
  if (!location) return { error: "generic" };

  let url: string;
  try {
    let accountId = location.stripe_account_id as string | null;
    if (!accountId) {
      const partner = location.partner as unknown as { email: string } | null;
      accountId = await createRecipientAccount({
        locationId: location.id,
        name: location.name,
        email: partner?.email ?? auth.user.email ?? "",
      });
      // Écrit par le serveur : le commerçant ne peut pas modifier ce champ lui-même.
      await createAdminClient().from("locations").update({ stripe_account_id: accountId }).eq("id", location.id);
    }
    url = await onboardingLink(
      accountId,
      `${siteUrl()}/${locale}/partenaire?stripe=refresh`,
      `${siteUrl()}/${locale}/partenaire?stripe=return`,
    );
  } catch (e) {
    console.error("Stripe Connect :", (e as Error).message);
    return { error: "checkout.stripe" };
  }
  redirect(url);
}

/** Lien vers le tableau de bord Stripe Express du commerçant (virements, IBAN). */
export async function openStripeDashboardAction(): Promise<FormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "notAuthenticated" };
  const { data: location } = await supabase
    .from("locations")
    .select("stripe_account_id")
    .eq("partner_id", auth.user.id)
    .maybeSingle();
  if (!location?.stripe_account_id) return { error: "generic" };

  let url: string;
  try {
    url = (await stripe().accounts.createLoginLink(location.stripe_account_id)).url;
  } catch (e) {
    console.error("Lien Stripe Express :", (e as Error).message);
    return { error: "checkout.stripe" };
  }
  redirect(url);
}
