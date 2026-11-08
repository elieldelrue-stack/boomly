import type { Settings } from "./types";

export const BAG_SIZES = ["small", "medium", "large"] as const;
export type BagSize = (typeof BAG_SIZES)[number];

export function priceForSize(settings: Settings, size: BagSize): number {
  switch (size) {
    case "small":
      return settings.price_small_cents;
    case "medium":
      return settings.price_medium_cents;
    case "large":
      return settings.price_large_cents;
  }
}

/**
 * Part du commerçant, en centimes, arrondie à l'inférieur.
 * Ex. 445 c à 50 % -> 222 c pour le commerçant, 223 c pour Boomly.
 */
export function partnerShareCents(totalCents: number, sharePercent: number): number {
  return Math.floor((totalCents * sharePercent) / 100);
}

export function formatEuros(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "en" ? "en-IE" : "fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
