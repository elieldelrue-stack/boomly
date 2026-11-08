import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Client Stripe côté serveur. La clé secrète ne quitte jamais le serveur. */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante (voir .env.example).");
  if (!key.startsWith("sk_test_") && process.env.STRIPE_LIVE_MODE !== "on") {
    // Garde-fou : le mode réel doit être activé explicitement.
    throw new Error("Clé Stripe réelle refusée : Boomly est en mode test.");
  }
  // STRIPE_API_HOST ne sert qu'aux tests automatiques (faux serveur Stripe local).
  const host = process.env.STRIPE_API_HOST;
  client = new Stripe(key, {
    appInfo: { name: "Boomly" },
    ...(host ? { host, port: Number(process.env.STRIPE_API_PORT ?? 443), protocol: (process.env.STRIPE_API_PROTOCOL as "http" | "https") ?? "https" } : {}),
  });
  return client;
}
