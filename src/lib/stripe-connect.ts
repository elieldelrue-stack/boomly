import "server-only";
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { createAdminClient } from "./supabase/admin";

export type StripeStatus = { accountId: string | null; detailsSubmitted: boolean; payoutsEnabled: boolean };

/** Crée le compte Stripe (Accounts v2, configuration « bénéficiaire ») d'un commerçant. */
export async function createRecipientAccount(params: {
  locationId: string;
  name: string;
  email: string;
}): Promise<string> {
  const account = await stripe().v2.core.accounts.create(
    {
      contact_email: params.email,
      display_name: params.name,
      dashboard: "express",
      identity: { country: "fr" },
      defaults: {
        currency: "eur",
        locales: ["fr-FR"],
        profile: { product_description: "Consigne à bagages partenaire Boomly" },
        // Boomly encaisse puis reverse : la plateforme assume les frais et les éventuelles pertes.
        responsibilities: { fees_collector: "application", losses_collector: "application" },
      },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      metadata: { location_id: params.locationId },
    },
    { idempotencyKey: `connect-v2-account-${params.locationId}` },
  );
  return account.id;
}

function computeStatus(accountId: string, account: Stripe.V2.Core.Account): StripeStatus {
  const transfers = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
  const due = (account.requirements?.entries ?? []).filter(
    (e) => e.awaiting_action_from === "user" && ["currently_due", "past_due"].includes(e.minimum_deadline?.status ?? ""),
  );
  return {
    accountId,
    detailsSubmitted: due.length === 0,
    payoutsEnabled: transfers === "active",
  };
}

/** Relit l'état du compte Stripe du commerçant et l'enregistre (champs non modifiables par lui). */
export async function syncStripeStatus(locationId: string, accountId: string): Promise<StripeStatus> {
  const account = await stripe().v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient", "requirements"],
  });
  const status = computeStatus(accountId, account);
  await createAdminClient()
    .from("locations")
    .update({ stripe_details_submitted: status.detailsSubmitted, stripe_payouts_enabled: status.payoutsEnabled })
    .eq("id", locationId);
  return status;
}

/** Lien vers le formulaire Stripe (identité, IBAN) pour ce compte. */
export async function onboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
  const link = await stripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        collection_options: { fields: "eventually_due" },
        refresh_url: refreshUrl,
        return_url: returnUrl,
      },
    },
  });
  return link.url;
}
