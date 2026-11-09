"use server";

import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeLocale } from "@/lib/locale";
import type { FormState } from "@/lib/types";
import { allowRequest } from "@/lib/rate-limit";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const quoteSchema = z.object({
  locationId: z.guid(),
  dropoffDate: z.string().regex(DATE),
  dropoffTime: z.string().regex(TIME),
  pickupDate: z.string().regex(DATE),
  pickupTime: z.string().regex(TIME),
  small: z.coerce.number().int().min(0).max(20),
  medium: z.coerce.number().int().min(0).max(20),
  large: z.coerce.number().int().min(0).max(20),
});

export type QuoteInput = z.input<typeof quoteSchema>;

export type Quote =
  | {
      ok: true;
      days: number;
      bags: number;
      remaining: number;
      price_small_cents: number;
      price_medium_cents: number;
      price_large_cents: number;
      total_cents: number;
    }
  | { ok: false; error: string; remaining?: number };

const KNOWN_ERRORS = new Set([
  "rateLimited",
  "unavailable", "bags", "past", "order", "tooLong", "dropoffClosed", "pickupClosed", "closure", "full",
]);

/** Devis calculé par la base (prix, horaires, capacité). Seule source de vérité pour les montants. */
export async function quoteAction(input: QuoteInput): Promise<Quote> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const q = parsed.data;
  if (!(await allowRequest("quote"))) return { ok: false, error: "rateLimited" };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("booking_quote", {
    p_location_id: q.locationId,
    p_dropoff_local: `${q.dropoffDate}T${q.dropoffTime}:00`,
    p_pickup_local: `${q.pickupDate}T${q.pickupTime}:00`,
    p_small: q.small,
    p_medium: q.medium,
    p_large: q.large,
  });
  if (error || !data) {
    console.error("Devis :", error?.message);
    return { ok: false, error: "generic" };
  }
  const quote = data as Quote & { partner_share_cents?: number; commission_cents?: number };
  if (!quote.ok) return { ok: false, error: KNOWN_ERRORS.has(quote.error) ? quote.error : "generic", remaining: quote.remaining };
  // On ne renvoie pas au navigateur la répartition commerçant / Boomly.
  return {
    ok: true,
    days: quote.days,
    bags: quote.bags,
    remaining: quote.remaining,
    price_small_cents: quote.price_small_cents,
    price_medium_cents: quote.price_medium_cents,
    price_large_cents: quote.price_large_cents,
    total_cents: quote.total_cents,
  };
}

const bookingSchema = quoteSchema.extend({
  name: z.string().trim().min(2, "required").max(120, "tooLong"),
  email: z.string().trim().toLowerCase().pipe(z.email("email")),
  phone: z.string().trim().max(30, "tooLong").optional().default(""),
  terms: z.literal("on", "terms"),
});

export async function createBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = safeLocale(formData.get("locale"));
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= ["name", "email", "phone", "terms"].includes(key) ? issue.message : "invalid";
    }
    return { fieldErrors };
  }
  const b = parsed.data;
  if (!(await allowRequest("booking"))) return { error: "rateLimited" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc("create_booking", {
      p_location_id: b.locationId,
      p_dropoff_local: `${b.dropoffDate}T${b.dropoffTime}:00`,
      p_pickup_local: `${b.pickupDate}T${b.pickupTime}:00`,
      p_small: b.small,
      p_medium: b.medium,
      p_large: b.large,
      p_name: b.name,
      p_email: b.email,
      p_phone: b.phone,
      p_locale: locale,
    })
    .single<{ id: string; reference: string; access_token: string }>();

  if (error || !data) {
    // Les règles refusées par la base remontent sous forme de code (ex. "full").
    const code = error?.message && KNOWN_ERRORS.has(error.message) ? error.message : "generic";
    if (code === "generic") console.error("Création de réservation :", error?.message);
    return { error: `booking.${code}` };
  }

  redirect({ href: `/reservation/${data.reference}?t=${data.access_token}`, locale });
  return {};
}
