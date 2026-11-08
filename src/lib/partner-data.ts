import "server-only";
import { createClient } from "./supabase/server";
import { shortTime } from "./hours";
import type { Location, OpeningSlot } from "./types";

const LOCATION_COLUMNS =
  "id, partner_id, name, business_type, description, address, postal_code, city, latitude, longitude, phone, siret, photos, capacity_per_day, status, status_reason, validated_at, created_at, updated_at";

/** Commerce du commerçant connecté (protégé par la RLS : il ne peut lire que le sien). */
export async function getMyLocation(userId: string): Promise<{ location: Location | null; hours: OpeningSlot[] }> {
  const supabase = await createClient();
  const { data: location } = await supabase
    .from("locations")
    .select(LOCATION_COLUMNS)
    .eq("partner_id", userId)
    .maybeSingle<Location>();
  if (!location) return { location: null, hours: [] };
  const hours = await getHours(location.id);
  return { location, hours };
}

export async function getHours(locationId: string): Promise<OpeningSlot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("opening_hours")
    .select("weekday, opens_at, closes_at")
    .eq("location_id", locationId)
    .order("weekday")
    .order("opens_at");
  return (data ?? []).map((h) => ({ ...h, opens_at: shortTime(h.opens_at), closes_at: shortTime(h.closes_at) }));
}

export { LOCATION_COLUMNS };
