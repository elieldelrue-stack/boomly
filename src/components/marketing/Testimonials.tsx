import { IconStar } from "./Icons";

type Item = { rating: number; comment: string; name: string | null; city: string | null };

/** Avis réels qui défilent automatiquement (pause au survol, immobiles si mouvement réduit). */
export function Testimonials({ items }: { items: Item[] }) {
  const loop = [...items, ...items];
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <ul className="flex w-max gap-4 motion-safe:animate-marquee group-hover:[animation-play-state:paused]">
        {loop.map((t, i) => (
          <li key={i} aria-hidden={i >= items.length} className="w-[290px] shrink-0 rounded-[28px] bg-white p-6 shadow-soft sm:w-[340px]">
            <div className="flex gap-0.5 text-brand-500">
              {Array.from({ length: t.rating }, (_, k) => (
                <IconStar key={k} className="h-4 w-4" />
              ))}
            </div>
            <p className="mt-3 line-clamp-5 text-[15px] leading-relaxed">« {t.comment} »</p>
            <p className="mt-4 text-sm font-semibold">
              {t.name}
              {t.city && <span className="font-normal text-muted"> · {t.city}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
