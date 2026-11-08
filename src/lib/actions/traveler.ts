"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBookingForTraveler } from "@/lib/booking-access";
import { refundBooking } from "@/lib/refunds";
import { sendAdminAlert, sendCancellationEmail } from "@/lib/email";
import { LOCATIONS_TAG } from "@/lib/public-locations";
import type { FormState } from "@/lib/types";

const access = z.object({
  reference: z.string().regex(/^BMY-[A-Z0-9]{6}$/),
  token: z.string().regex(/^[0-9a-f]{64}$/),
});

async function bookingFrom(formData: FormData) {
  const parsed = access.safeParse({ reference: formData.get("reference"), token: formData.get("token") });
  if (!parsed.success) return null;
  return getBookingForTraveler(parsed.data.reference, parsed.data.token);
}

/** Annulation gratuite jusqu'à l'heure de dépôt prévue, remboursement intégral. */
export async function cancelBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const booking = await bookingFrom(formData);
  if (!booking) return { error: "generic" };
  if (booking.status !== "paid" || new Date(booking.dropoff_at).getTime() <= Date.now()) {
    return { error: "manage.tooLate" };
  }

  // Passage atomique en "annulée" (évite un double remboursement).
  const { data: cancelled } = await createAdminClient()
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id)
    .eq("status", "paid")
    .gt("dropoff_at", new Date().toISOString())
    .select("id");
  if (!cancelled?.length) return { error: "manage.tooLate" };

  const result = await refundBooking({ bookingId: booking.id, amountCents: booking.total_cents, reclaimFromPartner: true });
  if (!result.ok) {
    await sendAdminAlert("Remboursement à faire", `Annulation ${booking.reference} : le remboursement automatique a échoué (${result.error}).`);
    return { ok: true };
  }
  await sendCancellationEmail(booking.id, result.refundedCents);
  updateTag(LOCATIONS_TAG);
  return { ok: true };
}

const reschedule = z.object({
  dropoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dropoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
const RESCHEDULE_ERRORS = new Set(["too_late", "price_changed", "past", "order", "tooLong", "dropoffClosed", "pickupClosed", "closure", "full"]);

/** Modification des horaires (même prix, place disponible, avant le dépôt). */
export async function rescheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const booking = await bookingFrom(formData);
  if (!booking) return { error: "generic" };
  const parsed = reschedule.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "booking.invalid" };
  const r = parsed.data;
  const { error } = await createAdminClient().rpc("reschedule_booking", {
    p_booking_id: booking.id,
    p_dropoff_local: `${r.dropoffDate}T${r.dropoffTime}:00`,
    p_pickup_local: `${r.pickupDate}T${r.pickupTime}:00`,
  });
  if (error) {
    const code = RESCHEDULE_ERRORS.has(error.message) ? error.message : "generic";
    if (code === "generic") console.error("Modification :", error.message);
    return { error: code === "too_late" || code === "price_changed" ? `manage.${code}` : `booking.${code}` };
  }
  return { ok: true };
}

const incident = z.object({
  type: z.enum(["lost", "damaged", "closed", "other"]),
  description: z.string().trim().min(5, "required").max(3000, "tooLong"),
});

/** Déclaration d'incident (photos facultatives). Commerce fermé : remboursement intégral automatique. */
export async function incidentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const booking = await bookingFrom(formData);
  if (!booking) return { error: "generic" };
  if (!["paid", "dropped_off", "picked_up"].includes(booking.status)) return { error: "manage.noIncident" };
  const parsed = incident.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { description: parsed.error.issues[0]?.message ?? "required" } };

  const admin = createAdminClient();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
  const photos: string[] = [];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) continue;
    const path = `${booking.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await admin.storage.from("incident-photos").upload(path, file, { contentType: file.type });
    if (!error) photos.push(path);
  }

  const { data: created, error } = await admin
    .from("incidents")
    .insert({ booking_id: booking.id, type: parsed.data.type, description: parsed.data.description, photos })
    .select("id")
    .single();
  if (error || !created) {
    console.error("Incident :", error?.message);
    return { error: "generic" };
  }

  // Commerce fermé à l'arrivée du voyageur (bagages jamais déposés) : remboursement intégral.
  const atShop = Date.now() >= new Date(booking.dropoff_at).getTime() - 30 * 60_000;
  if (parsed.data.type === "closed" && booking.status === "paid" && atShop) {
    await admin.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", booking.id).eq("status", "paid");
    const result = await refundBooking({ bookingId: booking.id, amountCents: booking.total_cents, reclaimFromPartner: true });
    if (result.ok) {
      await admin
        .from("incidents")
        .update({ status: "resolved", decision: "Remboursement intégral automatique (commerce fermé).", refunded_cents: result.refundedCents, resolved_at: new Date().toISOString() })
        .eq("id", created.id);
      await sendCancellationEmail(booking.id, result.refundedCents);
    }
    await sendAdminAlert(
      "Commerce fermé signalé",
      `Réservation ${booking.reference} chez ${booking.location.name} : le voyageur signale le commerce fermé. ${result.ok ? "Remboursé automatiquement." : "Remboursement automatique en échec, à faire à la main."}\n\n${parsed.data.description}`,
    );
    return { ok: true };
  }

  await sendAdminAlert(
    "Nouvel incident",
    `Réservation ${booking.reference} chez ${booking.location.name} — type : ${parsed.data.type}\n\n${parsed.data.description}`,
  );
  return { ok: true };
}

const review = z.object({
  rating: z.coerce.number().int().min(1, "rating").max(5, "rating"),
  comment: z.string().trim().max(1000, "tooLong").optional().default(""),
});

/** Avis après le retrait, un seul par réservation, publié immédiatement. */
export async function reviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const booking = await bookingFrom(formData);
  if (!booking) return { error: "generic" };
  if (booking.status !== "picked_up") return { error: "manage.noReview" };
  const parsed = review.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { rating: parsed.error.issues[0]?.message ?? "rating" } };

  const { error } = await createAdminClient()
    .from("reviews")
    .insert({
      booking_id: booking.id,
      location_id: booking.location.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      customer_first_name: booking.customer_name.split(" ")[0]?.slice(0, 60) ?? null,
    });
  if (error) {
    if (error.code === "23505") return { ok: true }; // déjà noté
    console.error("Avis :", error.message);
    return { error: "generic" };
  }
  updateTag(LOCATIONS_TAG);
  return { ok: true };
}
