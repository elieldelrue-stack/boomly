import type { OpeningSlot } from "./types";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Vérifie une liste de plages horaires : format, fermeture après ouverture, pas de chevauchement. */
export function validateHours(slots: OpeningSlot[]): "hours" | "hoursEmpty" | null {
  if (slots.length === 0) return "hoursEmpty";
  if (slots.length > 21) return "hours";
  for (const s of slots) {
    if (!Number.isInteger(s.weekday) || s.weekday < 1 || s.weekday > 7) return "hours";
    if (!TIME.test(s.opens_at) || !TIME.test(s.closes_at)) return "hours";
    if (s.closes_at <= s.opens_at) return "hours";
  }
  for (let day = 1; day <= 7; day++) {
    const sorted = slots.filter((s) => s.weekday === day).sort((a, b) => a.opens_at.localeCompare(b.opens_at));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].opens_at < sorted[i - 1].closes_at) return "hours";
    }
  }
  return null;
}

/** "09:00:00" (format de la base) -> "09:00" */
export function shortTime(t: string): string {
  return t.slice(0, 5);
}
