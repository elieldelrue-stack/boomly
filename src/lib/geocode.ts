// Recherche d'adresses et de lieux via la Géoplateforme (IGN / Base Adresse Nationale),
// service public gratuit et sans clé. Utilisé depuis le navigateur.

export type Place = { label: string; latitude: number; longitude: number };

type Feature = {
  properties: Record<string, unknown>;
  geometry: { coordinates: [number, number] };
};

const ENDPOINT = "https://data.geopf.fr/geocodage/search";

function text(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return v == null ? "" : String(v);
}

function toPlace(f: Feature): Place {
  const p = f.properties;
  const label =
    text(p.label) ||
    [text(p.toponym) || text(p.name), text(p.city)].filter(Boolean).join(", ");
  return { label, longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1] };
}

/** Adresses et lieux (gares, monuments…). Repli sur les adresses seules si besoin. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = encodeURIComponent(query);
  for (const index of ["address,poi", "address"]) {
    try {
      const res = await fetch(`${ENDPOINT}?index=${index}&autocomplete=1&limit=6&q=${q}`, { signal });
      if (!res.ok) continue;
      const json = (await res.json()) as { features?: Feature[] };
      const seen = new Set<string>();
      return (json.features ?? [])
        .map(toPlace)
        .filter((p) => p.label && !seen.has(p.label) && seen.add(p.label));
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
    }
  }
  return [];
}
