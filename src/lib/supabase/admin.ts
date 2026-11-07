import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client "administrateur" : contourne la RLS. À n'utiliser QUE côté serveur,
// pour des opérations de confiance (webhooks Stripe, calculs de prix, e-mails).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Variables Supabase manquantes (voir .env.example).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
