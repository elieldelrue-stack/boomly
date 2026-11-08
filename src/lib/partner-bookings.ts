import "server-only";
import { createClient } from "./supabase/server";
import { TZ, parisLocalToIso } from "./paris-time";

export type PartnerBooking = {
  id: string;
  reference: string;
  location_id: string;
  customer_name: string;
  customer_phone: string | null;
  bags_small: number;
  bags_medium: number;
  bags_large: number;
  bag_count: number;
  dropoff_at: string;
  pickup_at: string;
  status: string;
  partner_share_cents: number;
  dropoff_photos: string[];
  dropped_off_at: string | null;
  picked_up_at: string | null;
  late_fee_paid_at: string | null;
  late_fee_partner_cents: number;
  late_fee_waived: boolean;
  late_days: number;
  stripe_transfer_id: string | null;
};

const COLUMNS =
  "id, reference, location_id, customer_name, customer_phone, bags_small, bags_medium, bags_large, bag_count, dropoff_at, pickup_at, status, partner_share_cents, dropoff_photos, dropped_off_at, picked_up_at, late_fee_paid_at, late_fee_partner_cents, late_fee_waived, late_days, stripe_transfer_id";

/** Réservation lue avec les droits du commerçant connecté (RLS : uniquement son commerce). */
export async function getPartnerBooking(reference: string): Promise<PartnerBooking | null> {
  if (!/^BMY-[A-Z0-9]{6}$/.test(reference)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("bookings").select(COLUMNS).eq("reference", reference).maybeSingle<PartnerBooking>();
  return data ?? null;
}

/** Bornes UTC de la journée en cours à Paris. */
function todayBounds(): { start: string; end: string } {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const start = parisLocalToIso(date, "00:00");
  return { start, end: new Date(Date.parse(start) + 86_400_000).toISOString() };
}

/** Dépôts et retraits du jour + bagages actuellement en garde. */
export async function getTodayBookings(locationId: string): Promise<PartnerBooking[]> {
  const supabase = await createClient();
  const { start, end } = todayBounds();
  const { data } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .eq("location_id", locationId)
    .in("status", ["paid", "dropped_off", "picked_up"])
    .or(
      `and(dropoff_at.gte.${start},dropoff_at.lt.${end}),and(pickup_at.gte.${start},pickup_at.lt.${end}),status.eq.dropped_off`,
    )
    .order("dropoff_at");
  return (data ?? []) as PartnerBooking[];
}

/** Gains par mois (réservations récupérées) et gains à venir (payées ou en garde). */
export async function getEarnings(locationId: string): Promise<{ months: { month: string; cents: number; count: number }[]; upcomingCents: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("status, partner_share_cents, late_fee_partner_cents, late_fee_paid_at, picked_up_at")
    .eq("location_id", locationId)
    .in("status", ["paid", "dropped_off", "picked_up"]);

  const months = new Map<string, { cents: number; count: number }>();
  let upcomingCents = 0;
  for (const b of data ?? []) {
    const cents = b.partner_share_cents + (b.late_fee_paid_at ? b.late_fee_partner_cents : 0);
    if (b.status === "picked_up" && b.picked_up_at) {
      const month = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date(b.picked_up_at));
      const m = months.get(month) ?? { cents: 0, count: 0 };
      months.set(month, { cents: m.cents + cents, count: m.count + 1 });
    } else upcomingCents += cents;
  }
  return {
    months: [...months.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([month, v]) => ({ month, ...v })),
    upcomingCents,
  };
}

export async function getClosures(locationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("closures")
    .select("id, starts_at, ends_at, reason")
    .eq("location_id", locationId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  const closures = data ?? [];
  const now = Date.now();
  const pausedNow = closures.some((c) => Date.parse(c.starts_at) <= now && Date.parse(c.ends_at) >= now);
  return { closures, pausedNow };
}

/** Liens temporaires (10 min) vers les photos privées de dépôt. */
export async function signedPhotoUrls(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("dropoff-photos").createSignedUrls(paths, 600);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}
