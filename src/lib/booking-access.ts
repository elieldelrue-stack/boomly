import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import type { PublicLocation } from "./public-locations";

export type TravelerBooking = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  bags_small: number;
  bags_medium: number;
  bags_large: number;
  bag_count: number;
  dropoff_at: string;
  pickup_at: string;
  days: number;
  price_small_cents: number;
  price_medium_cents: number;
  price_large_cents: number;
  total_cents: number;
  status: string;
  expires_at: string | null;
  stripe_checkout_session_id: string | null;
  refunded_cents: number;
  dropped_off_at: string | null;
  picked_up_at: string | null;
  has_review: boolean;
  incidents: { id: number; type: string; status: string; created_at: string; decision: string | null }[];
  location: Pick<PublicLocation, "id" | "name" | "address" | "postal_code" | "city" | "latitude" | "longitude">;
};

function sameSecret(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Réservation lue uniquement si le lien secret (token) correspond. */
export async function getBookingForTraveler(reference: string, token: string): Promise<TravelerBooking | null> {
  if (!/^BMY-[A-Z0-9]{6}$/.test(reference) || !/^[0-9a-f]{64}$/.test(token)) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, reference, access_token, customer_name, customer_email, bags_small, bags_medium, bags_large, bag_count, dropoff_at, pickup_at, days, price_small_cents, price_medium_cents, price_large_cents, total_cents, status, expires_at, stripe_checkout_session_id, refunded_cents, dropped_off_at, picked_up_at, reviews(id), incidents(id, type, status, created_at, decision), location:locations(id, name, address, postal_code, city, latitude, longitude)",
    )
    .eq("reference", reference)
    .maybeSingle();

  if (!data || !sameSecret(data.access_token, token)) return null;
  const { access_token: _secret, reviews, ...booking } = data as typeof data & { reviews: unknown };
  void _secret;
  const hasReview = Array.isArray(reviews) ? reviews.length > 0 : !!reviews;
  return { ...booking, has_review: hasReview } as unknown as TravelerBooking;
}
