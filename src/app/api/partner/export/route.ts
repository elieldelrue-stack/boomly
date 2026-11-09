import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RGPD : le commerçant télécharge les données le concernant (fichier JSON).
// Les données personnelles des voyageurs ne sont pas incluses.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "non connecté" }, { status: 401 });

  const [{ data: profile }, { data: location }] = await Promise.all([
    supabase.from("profiles").select("id, role, full_name, email, phone, created_at").eq("id", auth.user.id).single(),
    supabase
      .from("locations")
      .select("id, name, business_type, description, address, postal_code, city, phone, siret, photos, capacity_per_day, status, created_at, validated_at, opening_hours(weekday, opens_at, closes_at), closures(starts_at, ends_at, reason)")
      .eq("partner_id", auth.user.id)
      .maybeSingle(),
  ]);
  const { data: bookings } = location
    ? await supabase
        .from("bookings")
        .select("reference, status, bags_small, bags_medium, bags_large, dropoff_at, pickup_at, total_cents, partner_share_cents, late_fee_partner_cents, dropped_off_at, picked_up_at, transferred_at")
        .eq("location_id", location.id)
        .order("created_at")
    : { data: [] };

  const body = JSON.stringify(
    { exported_at: new Date().toISOString(), account: profile, business: location, bookings: bookings ?? [] },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="boomly-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
