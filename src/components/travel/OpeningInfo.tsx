import { useTranslations } from "next-intl";
import { isOpenAt, slotsForDay } from "@/lib/paris-time";
import type { OpeningSlot } from "@/lib/types";

/** "Ouvert maintenant · Aujourd'hui 09:00–19:00" (heure de Paris). */
export function OpeningInfo({ hours, now }: { hours: OpeningSlot[]; now: { weekday: number; time: string } }) {
  const t = useTranslations("Search");
  const today = slotsForDay(hours, now.weekday);
  const open = isOpenAt(hours, now.weekday, now.time);
  return (
    <p className="text-sm">
      <span className={open ? "font-semibold text-green-700" : "font-semibold text-stone-500"}>
        {open ? t("openNow") : t("closedNow")}
      </span>
      <span className="text-muted">
        {" · "}
        {today.length
          ? t("today", { hours: today.map((s) => `${s.opens_at}–${s.closes_at}`).join(", ") })
          : t("closedToday")}
      </span>
    </p>
  );
}
