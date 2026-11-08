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
};

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

  return (data ?? []).map(({ opening_hours, ...loc }) => ({
    ...loc,
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
