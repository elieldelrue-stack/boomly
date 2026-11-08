import "server-only";
import { createClient } from "./supabase/server";
import { TZ } from "./paris-time";

export type MonthStats = {
  month: string;
  bookings: number;
  revenueCents: number;
  refundsCents: number;
  partnerCents: number;
  boomlyCents: number;
};

/** Chiffres par mois (lecture admin, protégée par la RLS). Montants avant frais Stripe. */
export async function getAdminStats() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("paid_at, status, total_cents, refunded_cents, partner_share_cents, partner_reversed_cents, late_fee_cents, late_fee_paid_at, late_fee_partner_cents, stripe_transfer_id")
    .not("paid_at", "is", null);

  const months = new Map<string, MonthStats>();
  let failedTransfers = 0;
  for (const b of data ?? []) {
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).format(new Date(b.paid_at!));
    const m = months.get(month) ?? { month, bookings: 0, revenueCents: 0, refundsCents: 0, partnerCents: 0, boomlyCents: 0 };
    const late = b.late_fee_paid_at ? b.late_fee_cents : 0;
    const partner =
      ["paid", "dropped_off", "picked_up"].includes(b.status)
        ? b.partner_share_cents + (b.late_fee_paid_at ? b.late_fee_partner_cents : 0) - b.partner_reversed_cents
        : 0;
    m.bookings += 1;
    m.revenueCents += b.total_cents + late;
    m.refundsCents += b.refunded_cents;
    m.partnerCents += partner;
    m.boomlyCents += b.total_cents + late - b.refunded_cents - partner;
    months.set(month, m);
    if (b.status === "picked_up" && !b.stripe_transfer_id && b.partner_share_cents > 0) failedTransfers += 1;
  }

  const [{ count: openIncidents }, { count: pendingLocations }] = await Promise.all([
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    months: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
    openIncidents: openIncidents ?? 0,
    pendingLocations: pendingLocations ?? 0,
    failedTransfers,
  };
}

export type AdminBookingRow = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total_cents: number;
  dropoff_at: string;
  created_at: string;
  location: { name: string } | null;
};

/** Recherche par référence, nom ou e-mail (50 résultats max, les plus récents d'abord). */
export async function searchBookings(q: string): Promise<AdminBookingRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("id, reference, customer_name, customer_email, status, total_cents, dropoff_at, created_at, location:locations(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  const term = q.trim().replace(/[%,()]/g, "");
  if (/^BMY-?[A-Z0-9]{6}$/i.test(term)) query = query.eq("reference", term.toUpperCase().replace(/^BMY-?/, "BMY-"));
  else if (term) query = query.or(`customer_email.ilike.%${term}%,customer_name.ilike.%${term}%`);
  const { data } = await query;
  return (data ?? []) as unknown as AdminBookingRow[];
}

export async function getAdminBooking(reference: string) {
  if (!/^BMY-[A-Z0-9]{6}$/.test(reference)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "*, location:locations(id, name, address, city, stripe_account_id), incidents(id, type, status, description, created_at, decision, refunded_cents), reviews(id, rating, comment)",
    )
    .eq("reference", reference)
    .maybeSingle();
  return data;
}

export async function listIncidents() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incidents")
    .select("id, type, status, description, created_at, booking:bookings(reference, customer_name, location:locations(name))")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getIncident(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incidents")
    .select("*, booking:bookings(id, reference, customer_name, customer_email, status, total_cents, refunded_cents, partner_share_cents, stripe_transfer_id, dropoff_photos, location:locations(name))")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function signedUrls(bucket: "dropoff-photos" | "incident-photos", paths: string[]): Promise<string[]> {
  if (!paths?.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 600);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export async function getLocationStats(locationId: string) {
  const supabase = await createClient();
  const [{ data: bookings }, { data: reviews }] = await Promise.all([
    supabase.from("bookings").select("status, total_cents, partner_share_cents").eq("location_id", locationId).not("paid_at", "is", null),
    supabase.from("reviews").select("id, rating, comment, customer_first_name, created_at").eq("location_id", locationId).order("created_at", { ascending: false }),
  ]);
  const b = bookings ?? [];
  const r = reviews ?? [];
  return {
    bookings: b.length,
    pickedUp: b.filter((x) => x.status === "picked_up").length,
    revenueCents: b.reduce((s, x) => s + x.total_cents, 0),
    partnerCents: b.filter((x) => x.status === "picked_up").reduce((s, x) => s + x.partner_share_cents, 0),
    ratingAvg: r.length ? Math.round((r.reduce((s, x) => s + x.rating, 0) / r.length) * 10) / 10 : null,
    reviews: r,
  };
}
