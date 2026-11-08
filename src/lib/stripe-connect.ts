import "server-only";
import { stripe } from "./stripe";
import { createAdminClient } from "./supabase/admin";

export type StripeStatus = { accountId: string | null; detailsSubmitted: boolean; payoutsEnabled: boolean };

/** Relit l'état du compte Stripe du commerçant et l'enregistre (champs non modifiables par lui). */
export async function syncStripeStatus(locationId: string, accountId: string): Promise<StripeStatus> {
  const account = await stripe().accounts.retrieve(accountId);
  const status = {
    accountId,
    detailsSubmitted: !!account.details_submitted,
    payoutsEnabled: !!account.payouts_enabled && account.capabilities?.transfers === "active",
  };
  await createAdminClient()
    .from("locations")
    .update({ stripe_details_submitted: status.detailsSubmitted, stripe_payouts_enabled: status.payoutsEnabled })
    .eq("id", locationId);
  return status;
}
