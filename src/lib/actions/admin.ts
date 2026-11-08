"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SETTINGS_TAG } from "@/lib/settings";
import { LOCATIONS_TAG } from "@/lib/public-locations";
import { syncStripeStatus } from "@/lib/stripe-connect";
import { refundBooking } from "@/lib/refunds";
import { transferPartnerShare } from "@/lib/transfers";
import { sendCancellationEmail } from "@/lib/email";
import type { FormState } from "@/lib/types";

async function assertAdmin(): Promise<FormState | null> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "notAuthenticated" };
  if (profile.role !== "admin") return { error: "forbidden" };
  return null;
}

const statusSchema = z.object({
  id: z.guid(),
  status: z.enum(["active", "refused", "suspended"]),
  reason: z
    .string()
    .trim()
    .max(500, "tooLong")
    .transform((v) => (v === "" ? null : v)),
});

export async function setLocationStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "generic" };
  const { id, status, reason } = parsed.data;

  const supabase = await createClient();

  // Un commerce n'est mis en ligne que si Stripe peut lui verser son argent.
  if (status === "active") {
    const { data: loc } = await supabase
      .from("locations")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", id)
      .single();
    let ready = !!loc?.stripe_payouts_enabled;
    if (!ready && loc?.stripe_account_id) {
      try {
        ready = (await syncStripeStatus(id, loc.stripe_account_id)).payoutsEnabled;
      } catch (e) {
        console.error("Vérification Stripe :", (e as Error).message);
      }
    }
    if (!ready) return { error: "stripeNotReady" };
  }

  const { error } = await supabase
    .from("locations")
    .update({ status, status_reason: status === "active" ? null : reason })
    .eq("id", id);
  if (error) {
    console.error("Changement de statut :", error.message);
    return { error: "generic" };
  }
  updateTag(LOCATIONS_TAG); // apparaît ou disparaît aussitôt de la carte
  return { ok: true };
}

/** "4,45" ou "4.45" -> 445 centimes */
const euros = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/, "price")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100))
  .refine((c) => c > 0 && c <= 100000, "price");

const settingsSchema = z.object({
  price_small: euros,
  price_medium: euros,
  price_large: euros,
  partner_share_percent: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100, "percent"),
});

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      price_small_cents: parsed.data.price_small,
      price_medium_cents: parsed.data.price_medium,
      price_large_cents: parsed.data.price_large,
      partner_share_percent: parsed.data.partner_share_percent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) {
    console.error("Réglages :", error.message);
    return { error: "generic" };
  }

  updateTag(SETTINGS_TAG); // la page d'accueil affiche aussitôt les nouveaux prix
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Étape 6 : remboursements, incidents, virements, avis
// ---------------------------------------------------------------------------

const euros6 = z
  .string()
  .trim()
  .regex(/^\d{1,5}([.,]\d{1,2})?$/, "price")
  .transform((v) => Math.round(Number(v.replace(",", ".")) * 100));

/** Remboursement total ou partiel, en choisissant qui le supporte. */
export async function refundAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const parsed = z
    .object({ bookingId: z.guid(), amount: euros6, reclaim: z.enum(["partner", "boomly"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { amount: "price" } };

  const result = await refundBooking({
    bookingId: parsed.data.bookingId,
    amountCents: parsed.data.amount,
    reclaimFromPartner: parsed.data.reclaim === "partner",
  });
  if (!result.ok) return { error: `refund.${result.error}` };
  await sendCancellationEmail(parsed.data.bookingId, result.refundedCents);
  return { ok: true };
}

/** Clôture d'un incident, avec remboursement éventuel. */
export async function resolveIncidentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const parsed = z
    .object({
      incidentId: z.coerce.number().int().positive(),
      status: z.enum(["resolved", "rejected"]),
      decision: z.string().trim().min(2, "required").max(3000, "tooLong"),
      amount: z.string().trim().optional().default(""),
      reclaim: z.enum(["partner", "boomly"]).optional().default("partner"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { decision: parsed.error.issues[0]?.message ?? "required" } };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: incident } = await supabase.from("incidents").select("id, booking_id, status, refunded_cents").eq("id", d.incidentId).single();
  if (!incident) return { error: "generic" };

  let refunded = 0;
  if (d.status === "resolved" && d.amount) {
    const amount = euros6.safeParse(d.amount);
    if (!amount.success) return { fieldErrors: { amount: "price" } };
    if (amount.data > 0) {
      const result = await refundBooking({ bookingId: incident.booking_id, amountCents: amount.data, reclaimFromPartner: d.reclaim === "partner" });
      if (!result.ok) return { error: `refund.${result.error}` };
      refunded = result.refundedCents;
      await sendCancellationEmail(incident.booking_id, refunded);
    }
  }

  const profile = await getCurrentProfile();
  const { error } = await supabase
    .from("incidents")
    .update({
      status: d.status,
      decision: d.decision,
      refunded_cents: incident.refunded_cents + refunded,
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id,
    })
    .eq("id", d.incidentId);
  if (error) {
    console.error("Incident :", error.message);
    return { error: "generic" };
  }
  return { ok: true };
}

/** Relance d'un virement au commerçant qui a échoué. */
export async function retryTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const denied = await assertAdmin();
  if (denied) return denied;
  const bookingId = z.guid().safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { error: "generic" };
  await transferPartnerShare(bookingId.data);
  return { ok: true };
}

/** Suppression d'un avis abusif. */
export async function deleteReviewAction(formData: FormData): Promise<void> {
  const denied = await assertAdmin();
  if (denied) return;
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const supabase = await createClient();
  await supabase.from("reviews").delete().eq("id", id); // RLS : admin uniquement
  updateTag(LOCATIONS_TAG);
}
