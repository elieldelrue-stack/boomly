import { IconPlus } from "./Icons";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-ink/10 rounded-[28px] bg-white px-5 shadow-soft sm:px-8">
      {items.map((it) => (
        <details key={it.q} className="group py-1">
          <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-left font-display text-lg font-semibold">
            {it.q}
            <span className="faq-icon grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cream-100 text-brand-600 transition-transform">
              <IconPlus className="h-4 w-4" />
            </span>
          </summary>
          <p className="pb-5 leading-relaxed text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
