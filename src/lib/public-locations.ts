import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { shortTime } from "./hours";
import type { BusinessType, OpeningSlot } from "./types";

export const LOCATIONS_TAG = "locations";

/** Informations publiques d'un point de dépôt (jamais le SIRET, le compte Stripe ni le commerçant). */
export type PublicLocation = {
  id: string;
  name: string;
  business_type: BusinessType;
  description: string | null;
  address: string;
  postal_code: string | null;
  city: string;
  latitude: number;
  longitude: number;
  photos: string[];
  capacity_per_day: number;
  hours: OpeningSlot[];
  rating_avg: number | null;
  rating_count: number;
};

export type PublicReview = { rating: number; comment: string | null; customer_first_name: string | null; created_at: string };

/** Tous les points de dépôt validés, mis en cache et rafraîchis à chaque validation/modification. */
export async function getPublicLocations(): Promise<PublicLocation[]> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("minutes");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, name, business_type, description, address, postal_code, city, latitude, longitude, photos, capacity_per_day, opening_hours(weekday, opens_at, closes_at)",
    )
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("Lecture des points de dépôt :", error.message);
    return [];
  }

  // Notes moyennes (avis publiés)
  const { data: reviews } = await supabase.from("reviews").select("location_id, rating");
  const stats = new Map<string, { sum: number; n: number }>();
  for (const r of reviews ?? []) {
    const s = stats.get(r.location_id) ?? { sum: 0, n: 0 };
    stats.set(r.location_id, { sum: s.sum + r.rating, n: s.n + 1 });
  }

  return (data ?? []).map(({ opening_hours, ...loc }) => ({
    ...loc,
    rating_avg: stats.has(loc.id) ? Math.round((stats.get(loc.id)!.sum / stats.get(loc.id)!.n) * 10) / 10 : null,
    rating_count: stats.get(loc.id)?.n ?? 0,
    hours: (opening_hours ?? [])
      .map((h: { weekday: number; opens_at: string; closes_at: string }) => ({
        weekday: h.weekday,
        opens_at: shortTime(h.opens_at),
        closes_at: shortTime(h.closes_at),
      }))
      .sort((a: OpeningSlot, b: OpeningSlot) => a.weekday - b.weekday || a.opens_at.localeCompare(b.opens_at)),
  }));
}

export async function getPublicLocation(id: string): Promise<PublicLocation | null> {
  const all = await getPublicLocations();
  return all.find((l) => l.id === id) ?? null;
}

/** Derniers avis publiés d'un point de dépôt. */
export async function getPublicReviews(locationId: string): Promise<PublicReview[]> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("minutes");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const { data } = await createAdminClient()
    .from("reviews")
    .select("rating, comment, customer_first_name, created_at")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}
