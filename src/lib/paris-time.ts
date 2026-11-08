import type { OpeningSlot } from "./types";

export const TZ = "Europe/Paris";

/** Date ("YYYY-MM-DD"), heure ("HH:MM") et jour ISO (1 = lundi) actuels à Paris. */
export function parisNow(now: Date = new Date()): { date: string; time: string; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: weekdays.indexOf(parts.weekday) + 1,
  };
}

/** Jour ISO (1 = lundi … 7 = dimanche) d'une date "YYYY-MM-DD". */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function slotsForDay(hours: OpeningSlot[], weekday: number): OpeningSlot[] {
  return hours.filter((h) => h.weekday === weekday);
}

export function isOpenAt(hours: OpeningSlot[], weekday: number, time: string): boolean {
  return slotsForDay(hours, weekday).some((s) => time >= s.opens_at && time < s.closes_at);
}

/** Créneaux de 15 min proposés pour un jour (de l'ouverture à 15 min avant la fermeture). */
export function timeOptions(hours: OpeningSlot[], weekday: number, minTime?: string): string[] {
  const out: string[] = [];
  for (const s of slotsForDay(hours, weekday)) {
    const [oh, om] = s.opens_at.split(":").map(Number);
    const [ch, cm] = s.closes_at.split(":").map(Number);
    let m = Math.ceil((oh * 60 + om) / 15) * 15;
    const end = ch * 60 + cm;
    for (; m < end; m += 15) {
      const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (!minTime || t >= minTime) out.push(t);
    }
  }
  return out;
}
