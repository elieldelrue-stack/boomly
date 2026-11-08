import "server-only";
import { stripe } from "./stripe";
import { createAdminClient } from "./supabase/admin";
import { sendAdminAlert } from "./email";

async function chargeOf(paymentIntentId: string): Promise<string | null> {
  const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
  return typeof pi.latest_charge === "string" ? pi.latest_charge : (pi.latest_charge?.id ?? null);
}

/**
 * Reverse au commerçant sa part après le retrait (et sa part du supplément de retard s'il a été payé).
 * Idempotent : ne transfère jamais deux fois (clé d'idempotence + identifiant enregistré).
 */
export async function transferPartnerShare(bookingId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select(
      "id, reference, status, partner_share_cents, stripe_payment_intent_id, stripe_transfer_id, late_fee_partner_cents, late_fee_paid_at, late_fee_payment_intent_id, late_fee_transfer_id, location:locations(stripe_account_id, stripe_payouts_enabled)",
    )
    .eq("id", bookingId)
    .single();
  if (!b || b.status !== "picked_up") return;
  const location = b.location as unknown as { stripe_account_id: string | null; stripe_payouts_enabled: boolean } | null;

  if (!location?.stripe_account_id) {
    await sendAdminAlert("Reversement impossible", `Réservation ${b.reference} : le commerce n'a pas de compte Stripe.`);
    return;
  }

  try {
    if (!b.stripe_transfer_id && b.partner_share_cents > 0 && b.stripe_payment_intent_id) {
      const charge = await chargeOf(b.stripe_payment_intent_id);
      const transfer = await stripe().transfers.create(
        {
          amount: b.partner_share_cents,
          currency: "eur",
          destination: location.stripe_account_id,
          transfer_group: b.id,
          description: `Boomly ${b.reference}`,
          metadata: { booking_id: b.id, reference: b.reference },
          ...(charge ? { source_transaction: charge } : {}),
        },
        { idempotencyKey: `transfer-${b.id}` },
      );
      await admin.from("bookings").update({ stripe_transfer_id: transfer.id, transferred_at: new Date().toISOString() }).eq("id", b.id);
    }

    if (!b.late_fee_transfer_id && b.late_fee_paid_at && b.late_fee_partner_cents > 0 && b.late_fee_payment_intent_id) {
      const charge = await chargeOf(b.late_fee_payment_intent_id);
      const transfer = await stripe().transfers.create(
        {
          amount: b.late_fee_partner_cents,
          currency: "eur",
          destination: location.stripe_account_id,
          transfer_group: b.id,
          description: `Boomly ${b.reference} (retard)`,
          metadata: { booking_id: b.id, reference: b.reference, kind: "late_fee" },
          ...(charge ? { source_transaction: charge } : {}),
        },
        { idempotencyKey: `transfer-late-${b.id}` },
      );
      await admin.from("bookings").update({ late_fee_transfer_id: transfer.id }).eq("id", b.id);
    }
  } catch (e) {
    console.error("Reversement Stripe :", (e as Error).message);
    await sendAdminAlert("Reversement en échec", `Réservation ${b.reference} : ${(e as Error).message}`);
  }
}
