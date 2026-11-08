"use server";

import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";
import { safeLocale } from "@/lib/locale";
import { transferPartnerShare } from "@/lib/transfers";
import { sendReviewRequest } from "@/lib/email";
import type { FormState } from "@/lib/types";
import { parisLocalToIso } from "@/lib/paris-time";

const KNOWN = new Set(["not_found", "wrong_status", "photos_required", "photos_invalid", "late_fee_due"]);
const id = z.guid();

function dbError(message?: string): FormState {
  const code = message && KNOWN.has(message) ? message : "generic";
  if (code === "generic") console.error("Dépôt/retrait :", message);
  return { error: `handover.${code}` };
}

/** Dépôt : au moins une photo des bagages, déjà envoyée dans l'espace privé. */
export async function dropoffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const bookingId = id.safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { error: "generic" };
  const photos = formData.getAll("photos").map(String).slice(0, 10);
  if (photos.length === 0) return { error: "handover.photos_required" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_dropoff", { p_booking_id: bookingId.data, p_photos: photos });
  if (error) return dbError(error.message);
  return { ok: true };
}

/** Retrait, puis reversement automatique de la part du commerçant. */
export async function pickupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const bookingId = id.safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { error: "generic" };
  const waive = formData.get("waive") === "1";

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_pickup", { p_booking_id: bookingId.data, p_waive_late_fee: waive });
  if (error) return dbError(error.message);

  // Le virement Stripe part juste après la réponse (le commerçant n'attend pas).
  after(async () => {
    await transferPartnerShare(bookingId.data);
    await sendReviewRequest(bookingId.data);
  });
  return { ok: true };
}

/** Lien de paiement Stripe pour le supplément de retard (le voyageur le scanne sur place). */
export async function lateFeeCheckoutAction(_prev: FormState & { url?: string }, formData: FormData): Promise<FormState & { url?: string }> {
  const locale = safeLocale(formData.get("locale"));
  const bookingId = id.safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { error: "generic" };

  // Vérification des droits avec le compte du commerçant (RLS).
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, status, customer_email, locale, late_fee_paid_at")
    .eq("id", bookingId.data)
    .maybeSingle();
  if (!booking || booking.status !== "dropped_off") return { error: "handover.wrong_status" };
  if (booking.late_fee_paid_at) return { ok: true };

  const { data: fee } = await supabase.rpc("booking_late_fee", { p_booking_id: bookingId.data });
  const lateFee = fee as { late_days: number; fee_cents: number; partner_cents: number } | null;
  if (!lateFee || lateFee.fee_cents <= 0) return { ok: true };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      locale: booking.locale === "en" ? "en" : "fr",
      customer_email: booking.customer_email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: lateFee.fee_cents,
            product_data: {
              name:
                locale === "en"
                  ? `Late pick-up · ${lateFee.late_days} extra day(s) · ${booking.reference}`
                  : `Retrait en retard · ${lateFee.late_days} jour(s) supplémentaire(s) · ${booking.reference}`,
            },
          },
        },
      ],
      metadata: { kind: "late_fee", booking_id: booking.id, reference: booking.reference },
      payment_intent_data: {
        transfer_group: booking.id,
        metadata: { kind: "late_fee", booking_id: booking.id, reference: booking.reference },
      },
      success_url: `${siteUrl()}/${locale}/paiement-ok`,
      cancel_url: `${siteUrl()}/${locale}`,
    });
    await createAdminClient()
      .from("bookings")
      .update({
        late_fee_checkout_session_id: session.id,
        late_fee_cents: lateFee.fee_cents,
        late_fee_partner_cents: lateFee.partner_cents,
        late_days: lateFee.late_days,
      })
      .eq("id", booking.id);
    return { url: session.url ?? undefined };
  } catch (e) {
    console.error("Supplément de retard :", (e as Error).message);
    return { error: "checkout.stripe" };
  }
}

// ---------------------------------------------------------------------------
// Pause et fermetures exceptionnelles
// ---------------------------------------------------------------------------

async function myLocationId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("locations").select("id").eq("partner_id", auth.user.id).maybeSingle();
  return data?.id ?? null;
}

/** « Je suis complet » : plus de nouvelles réservations jusqu'à la fin de la journée. */
export async function pauseTodayAction(): Promise<FormState> {
  const locationId = await myLocationId();
  if (!locationId) return { error: "notAuthenticated" };
  const now = new Date();
  const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
  const supabase = await createClient();
  const { error } = await supabase.from("closures").insert({
    location_id: locationId,
    starts_at: now.toISOString(),
    ends_at: parisLocalToIso(parisDate, "23:59"),
    reason: "pause",
  });
  if (error) {
    console.error("Pause :", error.message);
    return { error: "generic" };
  }
  return { ok: true };
}

const closureSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(200).optional().default(""),
});

export async function addClosureAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locationId = await myLocationId();
  if (!locationId) return { error: "notAuthenticated" };
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.end < parsed.data.start) return { error: "closureDates" };
  const supabase = await createClient();
  const { error } = await supabase.from("closures").insert({
    location_id: locationId,
    starts_at: parisLocalToIso(parsed.data.start, "00:00"),
    ends_at: parisLocalToIso(parsed.data.end, "23:59"),
    reason: parsed.data.reason || null,
  });
  if (error) {
    console.error("Fermeture :", error.message);
    return { error: "generic" };
  }
  return { ok: true };
}

export async function deleteClosureAction(formData: FormData): Promise<void> {
  const closureId = Number(formData.get("id"));
  if (!Number.isInteger(closureId)) return;
  const supabase = await createClient();
  await supabase.from("closures").delete().eq("id", closureId); // RLS : uniquement ses fermetures
}
