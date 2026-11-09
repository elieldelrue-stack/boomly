import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

const RULES = {
  login: { max: 10, windowSeconds: 600 }, // 10 essais / 10 min
  signup: { max: 5, windowSeconds: 3600 }, // 5 comptes / heure
  forgot: { max: 5, windowSeconds: 3600 },
  quote: { max: 150, windowSeconds: 600 }, // le prix se recalcule à chaque changement
  booking: { max: 20, windowSeconds: 3600 },
  checkout: { max: 30, windowSeconds: 3600 },
  incident: { max: 10, windowSeconds: 3600 },
  review: { max: 10, windowSeconds: 3600 },
} as const;

export type RateLimitedAction = keyof typeof RULES;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
}

/**
 * true si l'action est autorisée pour cette adresse IP, false si la limite est atteinte.
 * En cas de panne de la base, on laisse passer (le service reste disponible).
 */
export async function allowRequest(action: RateLimitedAction): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  const rule = RULES[action];
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: `${action}:${await clientIp()}`,
      p_window_seconds: rule.windowSeconds,
      p_max: rule.max,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
