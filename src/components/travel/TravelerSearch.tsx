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
        className="flex flex-col gap-2 sm:flex-row"
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
            className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          {open && suggestions.length > 0 && (
            <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-lg">
              {suggestions.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                    onClick={() => go(s)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="h-12 rounded-xl bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700">
          {t("button")}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button type="button" onClick={aroundMe} className="font-medium text-brand-700 hover:underline" disabled={locating}>
          📍 {locating ? t("locating") : t("aroundMe")}
        </button>
        {geoError && <span className="text-red-600">{t("geoError")}</span>}
      </div>
    </div>
  );
}
