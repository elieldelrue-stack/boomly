import "server-only";
import { stripe } from "./stripe";
import { createAdminClient } from "./supabase/admin";

export type RefundResult = { ok: true; refundedCents: number } | { ok: false; error: string };

/**
 * Rembourse le voyageur (total ou partiel) sur son paiement initial.
 * - reclaimFromPartner = true : la part du commerçant est reprise au prorata
 *   (annulation du virement s'il a déjà été versé, sinon réduction de sa part à verser).
 * - reclaimFromPartner = false : le remboursement est pris sur la part de Boomly uniquement.
 */
export async function refundBooking(params: {
  bookingId: string;
  amountCents: number;
  reclaimFromPartner: boolean;
}): Promise<RefundResult> {
  const admin = createAdminClient();
  const { data: b } = await admin
    .from("bookings")
    .select("id, reference, status, total_cents, refunded_cents, partner_share_cents, partner_reversed_cents, stripe_payment_intent_id, stripe_transfer_id")
    .eq("id", params.bookingId)
    .single();
  if (!b || !b.stripe_payment_intent_id) return { ok: false, error: "notPaid" };

  const refundable = b.total_cents - b.refunded_cents;
  const amount = Math.min(Math.max(0, Math.round(params.amountCents)), refundable);
  if (amount <= 0) return { ok: false, error: "nothingToRefund" };

  // Part du commerçant à reprendre, au prorata du montant remboursé.
  const partnerPortion = params.reclaimFromPartner ? Math.floor((amount * b.partner_share_cents) / b.total_cents) : 0;

  try {
    await stripe().refunds.create(
      { payment_intent: b.stripe_payment_intent_id, amount, metadata: { booking_id: b.id, reference: b.reference } },
      { idempotencyKey: `refund-${b.id}-${b.refunded_cents}-${amount}` },
    );
  } catch (e) {
    console.error("Remboursement Stripe :", (e as Error).message);
    return { ok: false, error: "stripe" };
  }

  const update: Record<string, unknown> = { refunded_cents: b.refunded_cents + amount, updated_at: new Date().toISOString() };
  if (b.refunded_cents + amount >= b.total_cents && ["paid", "cancelled"].includes(b.status)) update.status = "refunded";

  if (partnerPortion > 0) {
    if (b.stripe_transfer_id) {
      const reversible = b.partner_share_cents - b.partner_reversed_cents;
      const reversal = Math.min(partnerPortion, reversible);
      if (reversal > 0) {
        try {
          await stripe().transfers.createReversal(
            b.stripe_transfer_id,
            { amount: reversal, metadata: { booking_id: b.id } },
            { idempotencyKey: `reversal-${b.id}-${b.partner_reversed_cents}-${reversal}` },
          );
          update.partner_reversed_cents = b.partner_reversed_cents + reversal;
        } catch (e) {
          // Remboursement fait, mais la reprise a échoué (ex. solde du commerçant insuffisant).
          console.error("Reprise sur le commerçant :", (e as Error).message);
          await admin.from("bookings").update(update).eq("id", b.id);
          return { ok: false, error: "reversal" };
        }
      }
    } else {
      // Pas encore versé : on réduit simplement ce qui lui sera versé au retrait.
      update.partner_share_cents = Math.max(0, b.partner_share_cents - partnerPortion);
      update.commission_cents = b.total_cents - Math.max(0, b.partner_share_cents - partnerPortion);
    }
  }

  await admin.from("bookings").update(update).eq("id", b.id);
  return { ok: true, refundedCents: amount };
}
