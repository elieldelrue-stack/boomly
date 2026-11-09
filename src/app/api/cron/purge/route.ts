import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Tâche quotidienne (Vercel Cron, voir vercel.json) : efface les données des voyageurs
// au-delà de la durée de conservation (DATA_RETENTION_YEARS, 3 ans par défaut).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  const years = Math.max(1, Math.min(10, Number(process.env.DATA_RETENTION_YEARS) || 3));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("anonymize_old_bookings", { p_older_than: `${years} years` });
  if (error) {
    console.error("Effacement des données :", error.message);
    return NextResponse.json({ error: "échec" }, { status: 500 });
  }

  const paths = ((data ?? []) as { photo_path: string }[]).map((r) => r.photo_path).filter(Boolean);
  for (let i = 0; i < paths.length; i += 100) {
    const { error: rmError } = await admin.storage.from("dropoff-photos").remove(paths.slice(i, i + 100));
    if (rmError) console.error("Suppression des photos :", rmError.message);
  }
  return NextResponse.json({ anonymizedPhotos: paths.length, retentionYears: years });
}
