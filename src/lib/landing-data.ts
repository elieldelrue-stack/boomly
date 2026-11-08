import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { LOCATIONS_TAG } from "./public-locations";

export type LandingData = {
  locations: number;
  cities: number;
  bagsStored: number;
  ratingAvg: number | null;
  ratingCount: number;
  testimonials: { rating: number; comment: string; name: string | null; city: string | null }[];
};

const EMPTY: LandingData = { locations: 0, cities: 0, bagsStored: 0, ratingAvg: null, ratingCount: 0, testimonials: [] };

/** Vrais chiffres de la plateforme (aucune donnée inventée). */
export async function getLandingData(): Promise<LandingData> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("hours");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return EMPTY;

  try {
    const supabase = createAdminClient();
    const [{ data: locs }, { data: bags }, { data: reviews }] = await Promise.all([
      supabase.from("locations").select("id, city").eq("status", "active"),
      supabase.from("bookings").select("bag_count").eq("status", "picked_up"),
      supabase
        .from("reviews")
        .select("rating, comment, customer_first_name, location:locations(city)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const r = reviews ?? [];
    return {
      locations: locs?.length ?? 0,
      cities: new Set((locs ?? []).map((l) => l.city.trim().toLowerCase())).size,
      bagsStored: (bags ?? []).reduce((s, b) => s + b.bag_count, 0),
      ratingAvg: r.length ? Math.round((r.reduce((s, x) => s + x.rating, 0) / r.length) * 10) / 10 : null,
      ratingCount: r.length,
      testimonials: r
        .filter((x) => x.rating >= 4 && x.comment && x.comment.length >= 20)
        .slice(0, 12)
        .map((x) => ({
          rating: x.rating,
          comment: x.comment!,
          name: x.customer_first_name,
          city: (x.location as unknown as { city: string } | null)?.city ?? null,
        })),
    };
  } catch (e) {
    console.error("Chiffres de la page d'accueil :", (e as Error).message);
    return EMPTY;
  }
}
