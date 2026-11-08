import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Settings } from "./types";

export const SETTINGS_TAG = "settings";

// Valeurs affichées seulement si la base n'est pas joignable (ex. compilation sans clés).
// Les montants réellement facturés seront TOUJOURS relus dans la base (étape 3).
const FALLBACK: Settings = {
  price_small_cents: 445,
  price_medium_cents: 545,
  price_large_cents: 645,
  partner_share_percent: 50,
  currency: "eur",
};

/** Réglages (prix, part commerçant), mis en cache et rafraîchis quand l'admin les modifie. */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return FALLBACK;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("settings")
    .select("price_small_cents, price_medium_cents, price_large_cents, partner_share_percent, currency")
    .single();

  if (error || !data) {
    console.error("Lecture des réglages impossible :", error?.message);
    return FALLBACK;
  }
  return { ...data, partner_share_percent: Number(data.partner_share_percent) };
}
