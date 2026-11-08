"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { searchPlaces, type Place } from "@/lib/geocode";

export function TravelerSearch({ initialQuery = "", compact = false }: { initialQuery?: string; compact?: boolean }) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [chosen, setChosen] = useState<string>(initialQuery);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (query === chosen || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSuggestions(await searchPlaces(query, controller.signal));
        setOpen(true);
      } catch {
        /* requête annulée */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, chosen]);

  function go(place: Place) {
    setChosen(place.label);
    setQuery(place.label);
    setOpen(false);
    router.push(`/recherche?lat=${place.latitude.toFixed(5)}&lng=${place.longitude.toFixed(5)}&q=${encodeURIComponent(place.label)}`);
  }

  function aroundMe() {
    if (!navigator.geolocation) return setGeoError(true);
    setLocating(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        go({ label: t("myPosition"), latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <div className={compact ? "w-full" : "max-w-xl"}>
      <form
        role="search"
        className="flex flex-col gap-2 rounded-[26px] bg-white p-2 shadow-lift sm:flex-row sm:rounded-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (suggestions[0]) go(suggestions[0]);
          else router.push("/recherche");
        }}
      >
        <div className="relative sm:flex-1">
          <label htmlFor="q" className="sr-only">
            {t("placeholder")}
          </label>
          <input
            id="q"
            type="search"
            autoComplete="off"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 3) {
                setSuggestions([]);
                setOpen(false);
              }
            }}
            onFocus={() => suggestions.length && setOpen(true)}
            className="h-12 w-full rounded-full bg-transparent px-4 text-base outline-none placeholder:text-ink/45 focus:bg-cream-50"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-[1000] mt-3 w-full overflow-hidden rounded-2xl bg-white text-left shadow-lift ring-1 ring-ink/5">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-[15px] hover:bg-brand-50"
                    onClick={() => go(s)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="h-12 shrink-0 rounded-full bg-brand-500 px-6 font-semibold text-white transition hover:bg-brand-600">
          {t("button")}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button type="button" onClick={aroundMe} className="inline-flex items-center gap-1.5 font-semibold text-forest-700 hover:underline" disabled={locating}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" />
          </svg>
          {locating ? t("locating") : t("aroundMe")}
        </button>
        {geoError && <span className="text-red-600">{t("geoError")}</span>}
      </div>
    </div>
  );
}
