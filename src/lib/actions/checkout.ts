"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookingForTraveler } from "@/lib/booking-access";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";
import { safeLocale } from "@/lib/locale";
import type { FormState } from "@/lib/types";

const schema = z.object({
  reference: z.string().regex(/^BMY-[A-Z0-9]{6}$/),
  token: z.string().regex(/^[0-9a-f]{64}$/),
});

/** Ouvre la page de paiement Stripe pour une réservation en attente. Montants relus dans la base. */
export async function startCheckoutAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "generic" };
  const { reference, token } = parsed.data;

  const booking = await getBookingForTraveler(reference, token);
  if (!booking) return { error: "generic" };
  if (booking.status !== "pending_payment") return { error: "checkout.notPending" };
  if (!booking.expires_at || new Date(booking.expires_at).getTime() < Date.now() + 60_000) {
    return { error: "checkout.expired" };
  }

  const back = `${siteUrl()}/${locale}/reservation/${reference}?t=${token}`;
  const admin = createAdminClient();

  // Session déjà ouverte : on la réutilise.
  if (booking.stripe_checkout_session_id) {
    try {
      const existing = await stripe().checkout.sessions.retrieve(booking.stripe_checkout_session_id);
      if (existing.status === "open" && existing.url) redirect(existing.url);
    } catch (e) {
      if (isRedirect(e)) throw e;
    }
  }

  // Stripe exige au moins 30 min de validité ; on prolonge la place gardée d'autant.
  const expiresAt = Math.floor(Date.now() / 1000) + 31 * 60;
  const names = {
    small: locale === "en" ? "Small bag" : "Petit bagage",
    medium: locale === "en" ? "Medium bag" : "Bagage moyen",
    large: locale === "en" ? "Large bag" : "Grand bagage",
  };
  const dayWord = (n: number) => (locale === "en" ? (n > 1 ? "days" : "day") : n > 1 ? "jours" : "jour");
  const lines = (
    [
      ["small", booking.bags_small, booking.price_small_cents],
      ["medium", booking.bags_medium, booking.price_medium_cents],
      ["large", booking.bags_large, booking.price_large_cents],
    ] as const
  )
    .filter(([, n]) => n > 0)
    .map(([size, n, price]) => ({
      quantity: n,
      price_data: {
        currency: "eur",
        unit_amount: price * booking.days,
        product_data: {
          name: `${names[size]} · ${booking.days} ${dayWord(booking.days)}`,
          description: booking.location.name,
        },
      },
    }));

  // Contrôle de cohérence : la somme des lignes doit être exactement le total enregistré.
  const sum = lines.reduce((s, l) => s + l.quantity * l.price_data.unit_amount, 0);
  if (sum !== booking.total_cents) {
    console.error("Incohérence de montant", reference, sum, booking.total_cents);
    return { error: "generic" };
  }

  let url: string | null = null;
  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: lines,
        customer_email: booking.customer_email,
        locale: locale === "en" ? "en" : "fr",
        expires_at: expiresAt,
        client_reference_id: booking.id,
        metadata: { booking_id: booking.id, reference },
        payment_intent_data: {
          transfer_group: booking.id,
          metadata: { booking_id: booking.id, reference },
          description: `Boomly ${reference}`,
        },
        success_url: `${back}&paid=1`,
        cancel_url: back,
      },
      { idempotencyKey: `checkout-${booking.id}-${expiresAt}` },
    );
    url = session.url;
    await admin
      .from("bookings")
      .update({
        stripe_checkout_session_id: session.id,
        expires_at: new Date(expiresAt * 1000).toISOString(),
      })
      .eq("id", booking.id)
      .eq("status", "pending_payment");
  } catch (e) {
    console.error("Création du paiement Stripe :", (e as Error).message);
    return { error: "checkout.stripe" };
  }

  if (!url) return { error: "checkout.stripe" };
  redirect(url);
}

function isRedirect(e: unknown): boolean {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}
