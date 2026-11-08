import { BagIllustration } from "./BagIllustration";

type Labels = {
  shop: string;
  meta: string;
  open: string;
  dropoff: string;
  pickup: string;
  today: string;
  sizes: [string, string, string];
  prices: [string, string, string];
  total: string;
  totalValue: string;
  cta: string;
};

/** Maquette de téléphone (CSS) montrant l'écran de réservation Boomly. Purement illustrative. */
export function PhoneMockup({ l }: { l: Labels }) {
  const counts = [0, 1, 1];
  return (
    <div className="relative mx-auto w-[260px] rounded-[44px] bg-ink p-[10px] shadow-[0_40px_80px_-30px_rgb(23_19_15/0.55)] sm:w-[290px]" aria-hidden>
      <div className="absolute top-[18px] left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink" />
      <div className="overflow-hidden rounded-[36px] bg-cream-50">
        <div className="flex items-center justify-between px-6 pt-4 pb-1 text-[11px] font-semibold">
          <span>9:41</span>
          <span className="flex gap-1">
            <span className="h-2 w-3 rounded-sm bg-ink" />
            <span className="h-2 w-4 rounded-sm bg-ink" />
          </span>
        </div>
        <div className="relative h-24 overflow-hidden bg-forest-700">
          <div className="absolute -top-6 -right-4 h-24 w-24 rounded-full bg-forest-500" />
          <div className="absolute top-8 left-10 h-3 w-3 rounded-full bg-brand-400 ring-4 ring-brand-400/30" />
          <div className="absolute bottom-3 left-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-forest-800">{l.open}</div>
        </div>
        <div className="px-4 pt-3 pb-4">
          <p className="font-display text-[17px] leading-tight font-bold">{l.shop}</p>
          <p className="text-[11px] text-muted">{l.meta}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-white px-2.5 py-2 shadow-soft">
              <p className="text-muted">{l.dropoff}</p>
              <p className="font-semibold">{l.today} · 10:00</p>
            </div>
            <div className="rounded-xl bg-white px-2.5 py-2 shadow-soft">
              <p className="text-muted">{l.pickup}</p>
              <p className="font-semibold">{l.today} · 18:30</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {(["small", "medium", "large"] as const).map((s, i) => (
              <li key={s} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-soft">
                <BagIllustration size={s} className="h-7 w-7 text-ink" />
                <span className="flex-1 text-[11px] leading-tight">
                  <span className="block font-semibold">{l.sizes[i]}</span>
                  <span className="text-muted">{l.prices[i]}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${counts[i] ? "bg-brand-500 text-white" : "bg-cream-200 text-muted"}`}>
                  {counts[i]}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-[12px] text-muted">{l.total}</span>
            <span className="font-display text-xl font-bold">{l.totalValue}</span>
          </div>
          <div className="mt-2 rounded-full bg-brand-500 py-2.5 text-center text-[13px] font-semibold text-white">{l.cta}</div>
        </div>
      </div>
    </div>
  );
}
