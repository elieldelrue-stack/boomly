import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAlert, sendBookingConfirmation, sendPartnerNotification } from "@/lib/email";

// Stripe prévient le serveur ici. C'est la SEULE façon dont une réservation passe en "payée".
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "configuration" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text(); // corps brut, indispensable pour vérifier la signature
    event = await stripe().webhooks.constructEventAsync(body, signature, secret);
  } catch (e) {
    console.error("Webhook Stripe refusé :", (e as Error).message);
    return NextResponse.json({ error: "signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "paid") await markPaid(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          await createAdminClient()
            .from("bookings")
            .update({ status: "expired" })
            .eq("id", bookingId)
            .eq("status", "pending_payment")
            .eq("stripe_checkout_session_id", session.id);
        }
        break;
      }
    }
  } catch (e) {
    console.error("Traitement du webhook :", event.type, (e as Error).message);
    // 500 : Stripe réessaiera automatiquement plus tard.
    return NextResponse.json({ error: "processing" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markPaid(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, reference, status, total_cents")
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error(`réservation introuvable ${bookingId}`);

  if (session.amount_total !== booking.total_cents) {
    await sendAdminAlert("Montant incohérent", `Réservation ${booking.reference} : Stripe ${session.amount_total} c, base ${booking.total_cents} c.`);
  }

  // Transition idempotente : seules les réservations non encore payées changent.
  const { data: updated, error: updError } = await admin
    .from("bookings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    })
    .eq("id", bookingId)
    .in("status", ["pending_payment", "expired"])
    .select("id");
  if (updError) throw new Error(updError.message);

  if (updated?.length && booking.status === "expired") {
    await sendAdminAlert(
      "Paiement reçu après expiration",
      `La réservation ${booking.reference} a été payée après l'expiration de sa place. Vérifiez la capacité du commerce.`,
    );
  }

  // Les e-mails ne partent qu'une fois (dates d'envoi enregistrées).
  await sendBookingConfirmation(bookingId);
  await sendPartnerNotification(bookingId);
}
